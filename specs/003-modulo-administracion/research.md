# Technical Research & Decisions: Módulo 003 - Panel de Administración

## 1. Acceso Rápido Admin Demo y Persistencia de Sesión

### Decisión
Implementar un sistema de autenticación de administrador con soporte dual:
1) Formulario estándar de correo y contraseña validando contra la tabla `users` donde `role = 'admin'`.
2) Botón destacado **'Acceso Rápido Admin Demo (1 clic)'** que autocompleta `admin@fitstore.pe` / `admin123` e inicia sesión automáticamente.
3) Persistencia del estado administrativo en `localStorage` bajo la clave `fitstore_admin_auth` con datos de la sesión del administrador.

### Razón
- Cumple con el Principio Fundamental V de la Constitución de FitStore Pro (Verificabilidad sin bloqueos).
- Permite que evaluadores, desarrolladores y el dueño de la tienda puedan ingresar al panel instantáneamente sin tener que tipear credenciales ni lidiar con bloqueos de sesión durante demostraciones.
- Permite alternar libremente entre la Tienda del Cliente y el Panel Admin sin perder la sesión activa al recargar la página.

### Alternativas Consideradas
- **Sesión volátil solo en memoria de React**: Se descartó porque cada recarga del navegador (F5) obligaba a volver a ingresar credenciales, deteriorando la fluidez de las pruebas.
- **Cookies HttpOnly con JWT y refresh tokens**: Innecesariamente complejo para una aplicación local autónoma en SQLite, sumando problemas de expiración imprevista durante revisiones de producto.

---

## 2. Reversión Atómica de Stock al Rechazar Comprobantes

### Decisión
Cuando el administrador presiona el botón **'Rechazar Comprobante'** en la Pestaña de Pedidos:
1) Se ejecuta una transacción atómica en SQLite.
2) Se actualiza `payments.payment_status = 'Rechazado'` y `orders.order_status = 'Cancelado'`.
3) Se consulta `order_items` para esa orden y para cada ítem se ejecuta:
   ```sql
   UPDATE products
   SET stock = stock + ?
   WHERE id = ?;
   ```
4) El pedido cancelado queda registrado con su comprobante para fines de auditoría pero el stock vuelve a estar disponible para la venta pública de inmediato.

### Razón
- Al crearse una compra en el Módulo 002, el stock se reserva descontándose inmediatamente para evitar que dos clientes adquieran la misma unidad.
- Si un voucher resulta fraudulento, ilegible o no se acreditó en la cuenta del propietario, no devolver el stock provocaría que suplementos reales queden marcados como agotados, perjudicando las ventas de FitStore Pro.

### Alternativas Consideradas
- **Ajuste manual de stock por el dueño**: Se descartó por ser propenso a errores u olvidos operativos.
- **No descontar stock hasta aprobar el pago**: Se descartó porque permitía que múltiples usuarios compraran suplementos con stock unitario sin garantía de disponibilidad.

---

## 3. Gestión de Productos e Integridad Referencial Histórica

### Decisión
La tabla `order_items` almacena de forma desnormalizada el nombre del producto (`product_name`), la cantidad y el precio unitario (`unit_price`) congelados al momento de generar la orden.
- Para eliminar un producto del catálogo:
  - Si el producto no tiene compras previas, se ejecuta `DELETE FROM products WHERE id = ?`.
  - Si el producto tiene pedidos asociados en `order_items`, se desvincula el `product_id` a `NULL` o se preservan los ítems existentes gracias a que toda la información comercial (nombre, precio unitario y subtotal) ya está guardada en `order_items`.
- De este modo, la Boleta Electrónica histórica y el historial del cliente en "Mi Perfil y Mis Pedidos" nunca pierden su detalle original.

### Razón
- Protege la integridad de las boletas electrónicas emitidas en el Módulo 002.
- Facilita al administrador renovar el catálogo eliminando suplementos discontinuados sin romper órdenes del pasado.

### Alternativas Consideradas
- **Soft Delete con columna `active`**: Hubiese requerido alterar la migración de la tabla `products` y modificar todos los queries de búsqueda en `products.js`.
- **Restricción estricta de borrado (ON DELETE RESTRICT)**: Bloqueaba al administrador de borrar cualquier producto que tuviera al menos un pedido demo, frustrando la administración del catálogo.

---

## 4. Sincronización en Tiempo Real de `store_settings`

### Decisión
El formulario de la Pestaña 4 permite editar todos los campos de recaudación del propietario:
- `owner_name`: `'Jeancarlos José Huertas Quichca'`
- `yape_number`: `'924046690'`
- `plin_number`: `'983064501'`
- `bank_name`: `'BCP - Banco de Crédito del Perú'`
- `bank_account_soles`: `'22079349234041'`
- `bank_cci`: `'00222017934923404128'`
- `whatsapp_notification`: `'983064501'`

Al enviar la petición `PUT /api/settings`, el backend actualiza la fila única `id = 1` y retorna el objeto actualizado. En el frontend, el estado global de `storeSettings` en `App.jsx` se actualiza inmediatamente, de modo que si el usuario regresa a la tienda y abre el Carrito o el Checkout, ve de inmediato los nuevos números y códigos QR sin necesidad de reiniciar el servidor backend ni recargar el navegador.

### Razón
- Cumple cabalmente con el Principio III y V de la Constitución.
- Permite demostrar en vivo que cambiar el número de Yape o la cuenta bancaria en el panel admin impacta al segundo en lo que ve el comprador en el Checkout.

