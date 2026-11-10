# Guía Rápida de Verificación (Quickstart): Módulo 004 - Verificación Automática de Pagos

Esta guía describe los escenarios de prueba manual y de extremo a extremo para validar el **Motor de Verificación Automática e Instantánea de Pagos (Estilo Temu / Shein)**, el control anti-duplicados en SQLite y la experiencia animada en React.

---

## 1. Arranque del Entorno
```bash
# Iniciar backend Express y frontend Vite
npm run dev
```
- Tienda Frontend: `http://localhost:5173`
- Backend API REST: `http://localhost:3001/api`
- Base de datos: `backend/database.sqlite`

---

## 2. Escenario 1: Verificación Automática de Yape con Código OTP (Estilo Temu)
1. Ingresa a `http://localhost:5173`.
2. Agrega cualquier producto al carrito (ej. *Gold Standard 100% Whey 2lb*).
3. Abre el carrito y pulsa **"Continuar Compra"**.
4. Completa los datos de envío (DNI de 8 dígitos y celular de 9 dígitos).
5. En el paso de pago, selecciona **"Yape / Plin"**.
6. Observa que por defecto está activa la pestaña **"Código de Aprobación Yape (6 dígitos)"**.
7. Ingresa tu celular (ej. `987654321`) y un código OTP de 6 dígitos (ej. `492104`).
8. Haz clic en **"Pagar Ahora"**:
   - *Resultado esperado*: Se abre el modal animado en tiempo real con 3 fases (2.5s):
     1. `🔄 Conectando con cámara de compensación Yape / Plin...`
     2. `🔍 Verificando operación y abono en la cuenta de Jeancarlos José Huertas Quichca...`
     3. `✅ ¡Pago verificado automáticamente! Orden aprobada.`
   - La orden pasa directamente a `'Pagado / En Preparación'`, se descuenta el stock en SQLite y se muestra la Boleta Electrónica con el hash `YAPE-AUTO-XXXXXX`.

---

## 3. Escenario 2: Prevención Antifraude de Operación Duplicada
1. Repite el proceso de compra anterior con otro producto.
2. En el paso de pago con Yape, vuelve a ingresar el mismo código OTP utilizado previamente (`492104`).
3. Haz clic en **"Pagar Ahora"**:
   - *Resultado esperado*: El sistema detecta la duplicidad en SQLite y muestra la alerta en rojo:
     `"Esta operación o código de aprobación ya fue procesado y acreditado previamente. Por favor ingresa el código de tu abono actual."`
   - La orden NO se aprueba y el carrito permanece intacto.

---

## 4. Escenario 3: Transferencia Bancaria con Código CIP (24 Horas)
1. Agrega un producto al carrito y ve al Checkout.
2. Selecciona **"Transferencia Bancaria a Cuenta del Propietario"**.
3. Observa que el sistema muestra los datos oficiales del dueño (BCP Soles `22079349234041`, CCI `00222017934923404128`, Titular `Jeancarlos José Huertas Quichca`) y un código correlativo único (ej. `CIP-2026-004210`) con temporizador regresivo de 24 horas.
4. Ingresa un N° de operación bancaria o pulsa el botón de verificación automática.
5. *Resultado esperado*: El sistema valida el abono interbancario en menos de 2 segundos, aprueba la orden automáticamente y emite la boleta digital.

---

## 5. Escenario 4: Verificación con Tarjeta de Crédito/Débito
1. Selecciona el método **"Tarjeta de Crédito / Débito"**.
2. Usa la tarjeta preconfigurada `4242 4242 4242 4242`, mes/año futuro y CVV `123`.
3. Haz clic en **"Pagar con Tarjeta"**.
4. *Resultado esperado*: En 1.5 segundos se emite la autorización bancaria `AUTH-XXXXXX`, se liquida a la cuenta del dueño y se aprueba la orden automáticamente.

---

## 6. Escenario 5: Auditoría en el Panel de Administración
1. En la barra superior, haz clic en el botón de acceso rápido **"Admin"** (credenciales: `admin@fitstore.pe` / `admin123`).
2. Ve a la pestaña **"Pedidos"**:
   - *Resultado esperado*: Los pedidos aprobados automáticamente figuran con la insignia verde `'✓ Verificado Automáticamente'`, el contador de pendientes de verificación está en 0 y el total recaudado incluye las nuevas ventas.
3. Haz clic en el botón **"Ver Auditoría"** de cualquier pedido:
   - *Resultado esperado*: Se abre el modal de auditoría con el desglose del hash unívoco, el canal de conciliación y la cuenta de destino del propietario.
4. Avanza el estado del pedido a **"Marcar como Enviado"** y luego **"Marcar como Entregado"**.

---

## 7. Escenario 6: Cancelación de Orden y Reversión de Stock
1. En el Panel de Administración, localiza una orden recién pagada y presiona el botón **"Cancelar Orden"**.
2. Confirma la anulación:
   - *Resultado esperado*: La orden cambia a `'Cancelado'` y el inventario del producto en la tabla `products` se incrementa automáticamente devolviendo las unidades.
