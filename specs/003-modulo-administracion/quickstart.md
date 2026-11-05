# Guía Rápida de Verificación (Quickstart): Módulo 003 - Panel de Administración

Esta guía describe los escenarios de prueba manual y de extremo a extremo para validar el correcto funcionamiento del **Panel de Administración**, el **CRUD de Productos y Precios**, la **Conciliación de Vouchers**, la **Gestión de Clientes** y la **Configuración en Vivo de Cuentas Receptoras**.

---

## 1. Arranque del Entorno de Desarrollo

```bash
# Iniciar frontend y backend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API REST: `http://localhost:3001/api`
- Base de datos: `backend/database.sqlite`

---

## 2. Escenario 1: Login de Administrador en 1 Clic y Dashboard de KPIs

1. Abre `http://localhost:5173` en tu navegador.
2. En la barra superior persistente, haz clic en el botón **'Panel Admin'**.
3. En la pantalla de login, presiona el botón **'Acceso Rápido Admin Demo (1 clic)'**.
   - *Resultado esperado*: Se autocompletan las credenciales (`admin@fitstore.pe` / `admin123`), se autentica inmediatamente y se despliega el Dashboard administrativo con 4 tarjetas de KPIs:
     - Total Recaudado en Mis Cuentas en Soles (`S/ XX.XX`).
     - Pagos Pendientes de Verificación (badge naranja/rojo).
     - Total de Pedidos y Total de Productos (con indicador de bajo stock si $\le 5$ unidades).
     - Total de Clientes Registrados.
4. Recarga la página (F5):
   - *Resultado esperado*: La sesión permanece activa gracias a la persistencia en `localStorage`.

---

## 3. Escenario 2: CRUD de Productos y Modificación de Precios en Caliente

1. En el panel, haz clic en la **Pestaña 1 (Productos y Precios)**.
2. Presiona el botón **'Crear Nuevo Producto'**:
   - Nombre: `Pre-Entreno C4 Extreme 30 Serv`
   - Categoría: `Pre-Entrenos`
   - Precio: `149.90`
   - Stock: `25`
   - Guarda el formulario.
   - *Resultado esperado*: El producto se inserta en SQLite y aparece de inmediato en la tabla.
3. Haz clic en **'Editar'** sobre cualquier producto:
   - Modifica el precio a `S/ 180.00` y el stock a `3` unidades.
   - Guarda los cambios.
   - *Resultado esperado*: El producto muestra la insignia roja *"¡Bajo Stock!"* ($\le 5$ unidades).
4. Pulsa el botón **'Ir a la Tienda'** en la barra superior:
   - *Resultado esperado*: El producto nuevo y el precio modificado (`S/ 180.00`) se exhiben en la tienda pública sin recargar procesos del backend.

---

## 4. Escenario 3: Verificación de Vouchers y Conciliación Directa

1. Desde la tienda, realiza una compra por Yape usando los botones demo ("Generar N° Operación Demo" y "Cargar Voucher de Prueba").
2. Vuelve al **Panel Admin** y haz clic en la **Pestaña 2 (Pedidos y Vouchers)**.
3. Observa que el nuevo pedido aparece con estado de pago `'Pendiente de Verificación'` y estado de orden `'En Verificación'`.
4. Haz clic en el botón **'Ver Voucher'**:
   - *Resultado esperado*: Se abre el modal exhibiendo la captura del voucher en alta resolución, el N° de operación y la cuenta destino oficial (`Yape: 924046690 (Jeancarlos José Huertas Quichca)`).
5. Haz clic en **'Aprobar Abono en Mi Cuenta'**:
   - *Resultado esperado*: El pago cambia a `'Aprobado'` y la orden a `'Pagado / En Preparación'`.
6. Selecciona el desplegable de despacho y cámbialo a **'Enviado'**:
   - *Resultado esperado*: Se actualiza en la base de datos SQLite inmediatamente.

---

## 5. Escenario 4: Prueba de Reversión Automática de Stock al Rechazar Comprobante

1. Registra otra compra por Yape de un producto con stock conocido (ej. 10 unidades $\rightarrow$ baja a 9).
2. Entra a la Pestaña de Pedidos en el Panel Admin, abre el modal de voucher y pulsa **'Rechazar Comprobante'**.
   - *Resultado esperado*:
     - El pago cambia a `'Rechazado'` y la orden a `'Cancelado'`.
     - El stock del producto se restituye automáticamente en la tabla `products` de SQLite (vuelve a 10 unidades).

---

## 6. Escenario 5: Configuración en Vivo de Cuentas Receptoras (`store_settings`)

1. En el panel admin, ingresa a la **Pestaña 4 (Mis Cuentas Receptoras)**.
2. Verifica que los campos precarguen los datos oficiales:
   - Titular: `Jeancarlos José Huertas Quichca`
   - Yape: `924046690`
   - Plin: `983064501`
   - Banco: `BCP - Banco de Crédito del Perú`
   - Cuenta Soles: `22079349234041`
   - CCI: `00222017934923404128`
   - WhatsApp: `983064501`
3. Modifica el número de Yape o la cuenta BCP y pulsa **'Guardar Configuración de Cobro'**.
   - *Resultado esperado*: Muestra mensaje de éxito instantáneo.
4. Ve a la Tienda, agrega un suplemento y abre el Checkout:
   - *Resultado esperado*: La vista de Yape/BCP muestra de inmediato los datos actualizados para el cobro.

