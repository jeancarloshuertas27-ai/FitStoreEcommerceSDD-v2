# Research & Architectural Decisions: Módulo 007 - Mercado Pago (Tarjeta + Yape/Plin) y Tarifas de Envío por Provincia

**Feature Branch**: `007-mercadopago-yape-plin-envios` | **Spec**: [spec.md](./spec.md)

---

## 1. Integración con Mercado Pago Checkout Pro (Sandbox)

### Contexto y Necesidad
FitStore Pro requiere aceptar pagos con tarjeta de crédito/débito y medios digitales con verificación bancaria oficial, sin exponer credenciales sensibles ni almacenar datos de tarjetas (cumplimiento PCI-DSS). Mercado Pago Checkout Pro permite generar una preferencia (`preference`) en el servidor y redirigir al usuario al entorno seguro oficial (`sandbox_init_point`), liquidando en moneda nacional (`PEN` - Soles `S/`).

### Alternativas Evaluadas
1. **Mercado Pago Checkout API (Bricks / Custom)**:
   - *Pros*: La interfaz de la tarjeta se embebe dentro del sitio web.
   - *Contras*: Requiere manejo complejo de tokenización frontend con SDK JS, mayor superficie de seguridad y soporte limitado para otros medios de pago sin configuraciones extra.
2. **Mercado Pago Checkout Pro (API Preferences)** *(Elegida)*:
   - *Pros*: Delegación completa de seguridad y procesamiento a Mercado Pago. Soporta tarjetas peruanas de prueba, billeteras y cuotas; retorno automatizado vía `back_urls`; y verificación de autenticidad en backend mediante `GET https://api.mercadopago.com/v1/payments/{payment_id}`.
   - *Contras*: El usuario es redirigido temporalmente fuera del sitio, pero retorna automáticamente con `auto_return: 'approved'`.

### Decisión de Flujo y Seguridad
- **Variables de Entorno**: `MP_PUBLIC_KEY` y `MP_ACCESS_TOKEN` se configuran en `.env` (desarrollo local) y en secretos de Cloudflare Workers (`cf secret put MP_ACCESS_TOKEN`). Nunca se exponen en frontend ni se commitean a Git.
- **Creación de Preferencia (`POST /api/payments/create-preference`)**:
  - Parámetros: Ítems del carrito (`id`, `title`, `unit_price`, `quantity`, `currency_id: 'PEN'`) + Ítem de costo de flete provincial (`title: 'Costo de Envío - [Provincia]'`, `unit_price: shipping_cost`, `quantity: 1`).
  - Payer: `email`, `name`, `identification` (DNI de 8 dígitos).
  - URLs de retorno (`back_urls`): `success`, `failure`, `pending` apuntando a las rutas del frontend.
  - `auto_return: 'approved'`.
- **Soporte Dual e Idempotente**:
  - **Canal 1 (Frontend Return)**: `POST /api/payments/verify-mercadopago` con `payment_id` que valida contra Mercado Pago y aprueba la orden.
  - **Canal 2 (Webhook IPN)**: `POST /api/payments/mercadopago-webhook` que atiende notificaciones asíncronas de Mercado Pago (`topic=payment` o `type=payment`) para procesar compras incluso si el cliente cerró el navegador antes del redirect.
  - **Idempotencia**: Si la orden ya está en estado `'Pagado / En Preparación'`, la segunda llamada retorna éxito sin volver a descontar inventario ni duplicar registros.

---

## 2. Validador Antifraude en Backend para Yape / Plin

### Contexto y Necesidad
El método de pago directo con Yape o Plin permite al cliente pagar ingresando su número celular y su código OTP de aprobación. Para evitar fraudes en una tienda en línea sin pasarela formal de Yape (que requiere comisiones y RUC de gran empresa), el backend debe validar estrictamente que no se ingresen números telefónicos inválidos, códigos OTP triviales o secuencias ya usadas.

### Reglas Antifraude Implementadas
1. **Validación de Teléfono**: Expresión regular `^9\d{8}$` (exactamente 9 dígitos numéricos, comenzando en `9`).
2. **Validación de Código OTP**:
   - Longitud estricta: 6 dígitos numéricos (`^\d{6}$`).
   - **Rechazo de Códigos Triviales**:
     - Dígitos idénticos: `000000`, `111111`, `222222`, `333333`, `444444`, `555555`, `666666`, `777777`, `888888`, `999999`.
     - Secuencias consecutivas ascendentes/descendentes: `123456`, `654321`, `012345`, `543210`.
     - Patrones repetitivos: `121212`, `123123`, `989898`.
   - **Verificación de Duplicidad en Base de Datos**: Consulta previa en la tabla `payments` (`WHERE operation_number = ?`). Si ya existe, se rechaza con error 409 (Conflicto / Código ya utilizado).
3. **Criterio de Aceptación para Pruebas / Demo**:
   - Todo código de 6 dígitos que no sea trivial, no sea repetitivo y no esté duplicado es aceptado como válido.
   - Soporte asistido: Botón en frontend "Generar Código OTP de Prueba" que genera códigos verosímiles (ej. `784988`) para facilitar la evaluación sin fricción.

---

## 3. Modelo de Tarifas de Envío por Provincia (`shipping_rates`)

### Contexto y Necesidad
FitStore Pro despacha desde Ayacucho a nivel nacional. Los costos de flete varían según el destino:
- Local (Ayacucho - Huamanga): S/ 8.00 (1 a 2 días hábiles)
- Capital (Lima - Lima Metropolitana): S/ 12.00 (2 a 3 días hábiles)
- Otras Provincias (Nacional): S/ 18.00 (3 a 5 días hábiles)

### Diseño de la Persistencia
- **Tabla `shipping_rates`**:
  ```sql
  CREATE TABLE IF NOT EXISTS shipping_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department TEXT NOT NULL,
    province TEXT NOT NULL,
    cost REAL NOT NULL,
    delivery_days TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Compatibilidad Dual**: El esquema se aplica tanto en SQLite local (`backend/database.sqlite`) como en Cloudflare D1 (`fitstore-db`).
- **Comodín Nacional**: La tarifa "Nacional - Otras Provincias" permanece activa por defecto con costo S/ 18.00 para garantizar que cualquier cliente del país pueda comprar de inmediato, mientras el administrador puede agregar tarifas personalizadas para provincias específicas (ej. Arequipa, Cusco, Chiclayo).

---

## 4. Descuento Atómico de Stock y Cálculo de Flete

### Estrategia de Inventario
- **Cuándo se descuenta**: Exclusivamente tras la confirmación exitosa del pago (`status = 'approved'`). No se descuenta al abrir el modal ni al crear la preferencia de Mercado Pago, evitando "stock fantasma" por carritos o pasarelas abandonadas.
- **Transaccionalidad**:
  - En SQLite: Bloque de transacción (`BEGIN TRANSACTION` ... `COMMIT`).
  - En Cloudflare D1: Ejecución en lote (`env.DB.batch([...])`) que asegura atomicidad.
- **Cálculo del Total**:
  $$\text{Total} = \text{Subtotal (Productos)} + \text{Costo de Envío (Tarifa Seleccionada)}$$
  El costo de flete queda registrado en la orden (`orders.shipping_cost`) y se desglosa en la boleta de venta electrónica (`ElectronicReceipt`).
