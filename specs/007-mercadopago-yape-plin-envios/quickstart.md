# Quickstart & Verification Guide: Módulo 007 - Mercado Pago (Tarjeta + Yape/Plin) y Tarifas de Envío por Provincia

**Feature Branch**: `007-mercadopago-yape-plin-envios` | **Spec**: [spec.md](./spec.md)

---

## 1. Requisitos Previos y Entorno

1. **Variables de Entorno Locales (`.env` y `.dev.vars`)**:
   Asegúrate de que existan las credenciales sandbox de Mercado Pago:
   ```bash
   MP_PUBLIC_KEY=<TU_MP_PUBLIC_KEY>
   MP_ACCESS_TOKEN=<TU_MP_ACCESS_TOKEN>
   ```
2. **Arranque del Proyecto**:
   ```bash
   # Backend y Frontend concurrentes
   npm run dev
   ```
   - Tienda / Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`

---

## 2. Escenarios de Prueba Extremo a Extremo

### Escenario 1: Consulta y Gestión de Tarifas de Envío (`shipping_rates`)

1. **Consultar Tarifas Públicas vía cURL**:
   ```bash
   curl http://localhost:3001/api/shipping-rates
   ```
   *Resultado esperado*: Array JSON con 3 tarifas base (`Ayacucho - Huamanga S/ 8.00`, `Lima Metropolitana S/ 12.00`, `Otras Provincias S/ 18.00`).

2. **Crear Nueva Tarifa desde el Panel Admin**:
   - Inicia sesión como administrador (`admin@fitstore.pe` / `admin123`).
   - Ve a la nueva pestaña **"Tarifas de Envío"**.
   - Haz clic en **"Nueva Tarifa"**:
     - Departamento: `Arequipa`
     - Provincia: `Arequipa Ciudad`
     - Costo (`S/`): `15.00`
     - Plazo de Entrega: `2 a 3 días hábiles`
   - Guarda los cambios y verifica que aparezca en la lista activa.

---

### Escenario 2: Cálculo Dinámico de Envío en el Checkout

1. Abre la tienda como cliente o visitante (`http://localhost:5173`).
2. Agrega al carrito 1 suplemento (ej. Proteína Whey S/ 189.90).
3. Abre el Carrito y pulsa **"Finalizar Compra"**.
4. En el Checkout, observa el selector **"Departamento y Provincia de Envío"**:
   - Selecciona `Ayacucho - Huamanga (Entrega Local)`:
     - Costo de Envío: `S/ 8.00`
     - Total a pagar: `S/ 197.90`
   - Cambia a `Lima - Lima Metropolitana`:
     - Costo de Envío: `S/ 12.00`
     - Total a pagar: `S/ 201.90`
   - Cambia a `Nacional - Otras Provincias`:
     - Costo de Envío: `S/ 18.00`
     - Total a pagar: `S/ 207.90`
   *Resultado esperado*: El total se recalcula reactivamente al instante sin recargar la página.

---

### Escenario 3: Mercado Pago Checkout Pro (Sandbox)

1. En el Checkout, selecciona la opción **"Mercado Pago (Tarjeta de Crédito / Débito)"**.
2. Pulsa el botón **"Pagar con Mercado Pago"**.
3. Verifica que la API `POST /api/payments/create-preference` retorne la preferencia y redirija al entorno oficial seguro Sandbox de Mercado Pago (`sandbox_init_point`).
4. En Mercado Pago Sandbox:
   - Selecciona pagar con Tarjeta de Crédito de prueba (ej. Visa aprobada: `4242424242424241`).
   - Completa el pago de prueba y haz clic en volver al sitio.
5. Al retornar a FitStore Pro:
   - El sistema valida el `payment_id` en backend.
   - Se muestra la **Boleta Electrónica interactiva (`ElectronicReceipt`)** con serie B001, flete discriminado y número de transacción de Mercado Pago.
   - El inventario del producto disminuye en 1 unidad.

---

### Escenario 4: Validador Antifraude en Yape / Plin (Rechazo de Códigos Falsos)

1. En el Checkout, selecciona la opción **"Yape / Plin Directo"**.
2. **Prueba de Celular Inválido**:
   - Ingresa celular: `82345678` (8 dígitos) o `123456789` (no inicia en 9).
   - Intenta pagar: El sistema bloquea la acción indicando que debe tener 9 dígitos y empezar con 9.
3. **Prueba de OTP Trivial**:
   - Ingresa celular válido: `987654321`.
   - Ingresa código OTP: `123456` o `000000`.
   - Pulsa confirmar pago:
     ```bash
     # O vía cURL directo:
     curl -X POST http://localhost:3001/api/payments/yape-plin \
       -H "Content-Type: application/json" \
       -d '{"phone":"987654321","otp":"123456","items":[{"id":1,"quantity":1,"price":189.90}],"shipping":{"cost":12.00}}'
     ```
     *Resultado esperado*: Error HTTP 400 - "Código de aprobación inválido o trivial. Ingrese un código OTP legítimo."

---

### Escenario 5: Aprobación de Pago Yape / Plin Válido

1. En el Checkout, ingresa tu celular `987654321`.
2. Pulsa el botón asistente **"Generar Código OTP de Prueba"** (o ingresa un código verosímil como `849188`).
3. Pulsa **"Confirmar Pago"**:
   - El backend valida el OTP en menos de 1 segundo.
   - El estado de la orden cambia a `'Pagado / En Preparación'`.
   - Se despliega la Boleta Electrónica con el número de operación `YAPE-849188` y desglose de flete.

---

### Escenario 6: Rechazo Estricto de Códigos Duplicados

1. Intenta realizar una segunda compra ingresando exactamente el mismo código OTP (`849188`) que se usó en el Escenario 5.
2. Pulsa confirmar pago.
   *Resultado esperado*: Error HTTP 409 - "Este número de operación ya fue utilizado en otra transacción."
