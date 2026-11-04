# Quickstart & Guía de Verificación: Módulo 002 - Pasarela de Checkout y Cobros

Esta guía detalla los pasos para verificar de extremo a extremo el flujo completo de Checkout con cobros dirigidos a las cuentas reales del propietario implementado en el **Módulo 002**.

---

## 1. Puesta en Marcha

```bash
# Levantar simultáneamente backend y frontend
npm run dev
```
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:3001`

---

## 2. Escenarios de Prueba de Pago Paso a Paso

### Escenario 1: Pago por Yape o Plin con Voucher Demo en 1 Clic
1. Abre `http://localhost:5173` y agrega un producto al carrito (ej. *Gold Standard Whey 2lb*).
2. Abre el carrito y pulsa **"Ir a Pagar (Checkout)"**:
   - *Resultado esperado*: Se abre el modal interactivo de Checkout con el Paso 1 (Datos del comprador precargados de Carlos Mendoza).
3. Pulsa **"Continuar al Pago"** y selecciona la pestaña **"Yape"** o **"Plin"**:
   - *Resultado esperado*: Se muestran los datos del titular (**Jeancarlos José Huertas Quichca**), el número de celular (**924046690** para Yape / **983064501** para Plin), el botón 'Copiar Número' y el código QR dinámico.
4. Haz clic en **"Generar N° Operación Demo"**:
   - *Resultado esperado*: Se autocompleta el campo con un número correlativo (ej. `OP-839201`).
5. Haz clic en **"Cargar Voucher de Prueba"**:
   - *Resultado esperado*: Se genera instantáneamente un voucher simulado en Base64 con logotipo oficial, monto en Soles y datos del titular.
6. Pulsa **"Confirmar y Enviar Comprobante"**:
   - *Resultado esperado*: Se genera la orden, el carrito se vacía y se muestra la **Boleta Electrónica** con estado `'En Verificación'` y la cuenta destino `'Yape: 924046690 (Jeancarlos José Huertas Quichca)'`.

### Escenario 2: Pago por Transferencia Bancaria Directa (BCP / CCI)
1. Agrega productos al carrito y accede al Paso 2 del Checkout.
2. Selecciona la pestaña **"Transferencia Bancaria"**:
   - *Resultado esperado*: Se despliega una tarjeta bancaria azul del BCP con el titular (*Jeancarlos José Huertas Quichca*), N° de Cuenta en Soles (*22079349234041*) y CCI (*00222017934923404128*).
3. Haz clic en **"Copiar N° Cuenta"** o **"Copiar CCI"**:
   - *Resultado esperado*: Los botones indican "¡Copiado!" con feedback visual verde.
4. Pulsa **"Generar N° Operación Demo"** y **"Cargar Comprobante Demo"**:
   - *Resultado esperado*: Se previsualiza la constancia de transferencia bancaria BCP.
5. Confirma la compra:
   - *Resultado esperado*: Se emite la Boleta Electrónica y en SQLite queda registrada la cuenta destino exacta (`BCP - Banco de Crédito del Perú Cta: 22079349234041...`).

### Escenario 3: Pasarela de Tarjeta Sandbox con Liquidación a Cuenta Recaudadora
1. En el Paso 2 del Checkout, selecciona la pestaña **"Tarjeta de Crédito / Débito"**:
   - *Resultado esperado*: Se muestra el formulario interactivo de tarjeta junto al aviso de seguridad: *"El cobro procesado se depositará automáticamente en la cuenta recaudadora N° 22079349234041 de Jeancarlos José Huertas Quichca"*.
2. Haz clic en el botón destacado **"Autocompletar Tarjeta Sandbox (4242...)"**:
   - *Resultado esperado*: Se rellenan automáticamente los campos de tarjeta de prueba (`4242 4242 4242 4242`, titular, `12/28`, CVV `123`).
3. Pulsa **"Pagar con Tarjeta"**:
   - *Resultado esperado*: Tras un breve procesamiento (800 ms), la pasarela aprueba el cobro, genera un código unívoco `AUTH-XXXX` (ej. `AUTH-7419`) y actualiza el pedido a `'Pagado / En Preparación'`.

### Escenario 4: Boleta Electrónica y Notificación a WhatsApp
1. Al visualizar la Boleta Electrónica tras cualquier compra exitosa:
   - *Resultado esperado*: Se detallan código de orden (`ORD-2026-XXX`), fecha, desglose de suplementos, total en Soles (`S/`) y la cuenta receptora del propietario.
2. Haz clic en **"Notificar compra y enviar voucher a mi WhatsApp"**:
   - *Resultado esperado*: Se abre una ventana hacia `https://wa.me/51983064501` con el mensaje preformateado con el código de orden, monto, ítems y constancia de pago.
3. Regresa a la tienda:
   - *Resultado esperado*: El badge del carrito se encuentra en `0` (vaciado automático). Al ir a "Mi Perfil y Mis Pedidos", la nueva orden aparece en el historial con su respectivo método y cuenta destino.
