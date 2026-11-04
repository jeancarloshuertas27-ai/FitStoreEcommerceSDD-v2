# Research & Technical Decisions: Módulo 002 - Pasarela de Checkout y Cobros al Propietario

## 1. Integración Dinámica con `store_settings`

### Lectura Centralizada en Tiempo Real
- **Decisión**: El componente de Checkout y los flujos de pago consultarán directamente los datos de `store_settings` vía API (`GET /api/settings`) al inicializarse, además de permitir pasar los datos como propiedades reactivas.
- **Razón**: Asegura que cualquier cambio realizado en la configuración del propietario (cambio de número de Yape/Plin, cambio de cuenta BCP o CCI) se refleje inmediatamente en el modal de checkout sin necesidad de recompilar el frontend.
- **Campos utilizados**:
  - `owner_name`: Nombre completo del titular (`Jeancarlos José Huertas Quichca`).
  - `yape_number`: Celular para Yape (`924046690`).
  - `plin_number`: Celular para Plin (`983064501`).
  - `bank_name`: Entidad financiera (`BCP - Banco de Crédito del Perú`).
  - `bank_account_soles`: Cuenta en Soles (`22079349234041`).
  - `bank_cci`: CCI (`00222017934923404128`).
  - `whatsapp_notification`: Número para confirmaciones (`983064501`).

---

## 2. Generación Dinámica de Código QR para Yape y Plin

### Enfoque de Renderizado
- **Decisión**: Renderizar el código QR interactivo combinando un generador de QR dinámico basado en SVG/Canvas local y fallback de alta disponibilidad (`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=...`), codificando la intención de pago:
  `YAPE|PLIN: {numero} | MONTO: S/ {total} | FITSTORE PRO`
- **Razón**: Permite a cualquier comprador escanear el código directamente desde la app de Yape o Plin en su teléfono móvil o pulsar el botón de 'Copiar Número' para transferencia directa.

---

## 3. Manejo de Vouchers de Pago y Conversión a Base64

### Procesamiento de Archivos y Generador Demo en 1 Clic
- **Subida de Voucher Real**:
  - Utiliza la API nativa `FileReader` para convertir imágenes (`.png`, `.jpg`, `.jpeg`, `.webp`) a cadenas Base64 (`data:image/png;base64,...`).
  - Incluye compresión automática mediante un `<canvas>` oculto en caso de imágenes grandes, asegurando que el tamaño permanezca por debajo de 500 KB para un almacenamiento ágil en la columna `payments.voucher_image` de SQLite.
- **Generador de Voucher Demo en 1 Clic**:
  - Un utilitario en JavaScript (`generateDemoVoucher(method, amount, opNumber, ownerName)`) dibuja dinámicamente sobre un `<canvas>` un comprobante auténtico con la paleta de colores de Yape (morado `#742284` / verde agua), Plin (azul `#00a4e4` / magenta) o BCP (azul marino `#002a8f` / naranja).
  - Incluye fecha/hora actual, el monto exacto en Soles (`S/ XX.XX`), el número de operación correlativo generado y el nombre del titular (**Jeancarlos José Huertas Quichca**).

---

## 4. Pasarela Sandbox de Tarjeta con Liquidación Explícita

### Flujo de Autorización y Transacciones
- **Decisión**: Construir un componente interactivo de formulario de tarjeta con detección visual del tipo de tarjeta (Visa, Mastercard), formateo automático de 16 dígitos (`XXXX XXXX XXXX XXXX`), fecha de expiración (`MM/AA`), código de seguridad CVV (`XXX`) y selector de 1 a 12 cuotas.
- **Botón 'Autocompletar Tarjeta Sandbox (4242...)'**:
  - Rellena automáticamente los campos con la tarjeta universal de prueba:
    - Número: `4242 4242 4242 4242`
    - Titular: Nombre del cliente actual (ej. `Carlos Mendoza Ríos`)
    - Expiración: `12/28` (fecha futura válida)
    - CVV: `123`
- **Liquidación hacia la Cuenta del Propietario**:
  - Al procesar, el frontend muestra un spinner simulado de 800 ms y genera un código de autorización formal `AUTH-XXXX` (ej. `AUTH-8924`).
  - El backend registra en SQLite:
    - `orders.order_status` = `'Pagado / En Preparación'`
    - `payments.payment_status` = `'Aprobado'`
    - `payments.auth_code` = `AUTH-XXXX`
    - `payments.card_last4` = `'4242'`
    - `payments.destination_account` = `'Cuenta Recaudadora BCP: 22079349234041 (Jeancarlos José Huertas Quichca)'`

---

## 5. Boleta Electrónica y Notificación a WhatsApp

### Enlace Directo a WhatsApp
- **Decisión**: Utilizar el esquema oficial `https://wa.me/51${whatsapp_notification}?text=${encodedMessage}`.
- **Estructura del Mensaje**:
  ```text
  ¡Hola Jeancarlos! Acabo de realizar una compra en FitStore Pro 🏋️‍♂️

  📦 Pedido: ORD-2026-003
  👤 Cliente: Carlos Mendoza Ríos (DNI: 72458912)
  💵 Total Pagado: S/ 249.00
  💳 Método: Yape (Operación: OP-749182)
  📍 Entrega: Av. Arequipa 2450, Dpto 402, Lima

  Adjunto mi comprobante de pago para la validación y despacho. ¡Muchas gracias!
  ```
- **Razón**: Automatiza el canal de atención comercial y verificación de vouchers sin fricción para el usuario ni para el dueño de la tienda.

