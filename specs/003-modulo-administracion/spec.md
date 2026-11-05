# Feature Specification: Módulo 003 - Panel de Administración Completo (Productos, Precios, Clientes, Pedidos y Configuración de Cuentas)

**Feature Branch**: `003-modulo-administracion`

**Created**: 2026-11-05

**Status**: Ready for Clarification / Planning

**Input**: User description: "Construir el Módulo de Administración integral de FitStore Pro conectado a SQLite para gestionar productos y precios, administrar clientes, verificar y aprobar los pagos recibidos en las cuentas del propietario, y contar con una pestaña dedicada para configurar/actualizar en cualquier momento el Número de Cuenta Bancaria, CCI y número de Yape/Plin del dueño de la tienda."

## Clarifications

### Session 2026-11-05
- Q: ¿Cómo debe manejarse en SQLite la eliminación de un producto del catálogo que ya cuenta con pedidos históricos registrados en la tienda? → A: Eliminación del catálogo activo para nuevas compras preservando intacto el registro histórico en `order_items` con nombre (`product_name`) y precio unitario (`unit_price`) congelados.
- Q: ¿Qué acción debe realizar el sistema respecto al inventario de suplementos cuando el administrador pulsa "Rechazar Comprobante" en un pedido en verificación? → A: Reversión automática inmediata: el sistema restituye de forma atómica en SQLite el stock de los productos del pedido hacia la tabla `products`, marcando la orden como `'Cancelado'` y el pago como `'Rechazado'`.
- Q: ¿Cómo debe persistirse la sesión del administrador para permitir alternar fluidamente entre la Tienda del Cliente y el Panel Admin durante las pruebas y operación? → A: Persistencia en almacenamiento local (`localStorage`) que mantiene la sesión activa entre recargas y cambios de vista hasta que el usuario pulse explícitamente "Cerrar Sesión".
- Q: ¿Qué umbral de unidades en inventario debe activar la alerta visual de stock crítico en el Dashboard y en la tabla de productos? → A: Umbral de 5 unidades o menos ($\le 5$) para activar la alerta en el Dashboard y la insignia roja "¡Bajo Stock!" en la tabla de productos, más la etiqueta "Agotado" si el stock llega a 0.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticación Rápida y Dashboard Financiero con KPIs en Tiempo Real (Priority: P1)

El administrador accede al Panel de Administración desde el botón persistente de la barra superior ("Panel Admin"). La pantalla de login presenta el botón destacado **'Acceso Rápido Admin Demo (1 clic)'** que autocompleta inmediatamente las credenciales del sistema (`admin@fitstore.pe` / `admin123`) e inicia sesión sin fricción. Una vez dentro, el administrador visualiza un Dashboard ejecutivo con 4 tarjetas de métricas en tiempo real:
1) **Total Recaudado en Mis Cuentas** en Soles (`S/ XX.XX`), computando todas las transacciones pagadas o aprobadas.
2) **Pagos Pendientes de Verificación** con badge de atención visual que indica cuántos vouchers de Yape, Plin o Transferencia están a la espera de validación manual.
3) **Métricas de Catálogo y Stock**, exhibiendo el total de productos y una alerta inmediata si existen artículos con stock crítico (menor o igual a 5 unidades).
4) **Total de Clientes Registrados** en la base de datos SQLite.
El panel incluye una barra superior de navegación interna que permite regresar a la Tienda del Cliente en 1 clic o cerrar sesión.

**Why this priority**: Es la puerta de entrada operativa y el centro de comando financiero del negocio, permitiendo al propietario conocer el flujo de caja, alertas urgentes de cobro y navegar por las secciones administrativas.

**Independent Test**: Hacer clic en "Panel Admin" en la barra superior, presionar el botón "Acceso Rápido Admin Demo", verificar el ingreso inmediato y comprobar que las 4 tarjetas de KPIs reflejen los datos reales de `database.sqlite`.

**Acceptance Scenarios**:
1. **Given** un usuario no autenticado como administrador, **When** hace clic en "Panel Admin", **Then** se muestra la pantalla de inicio de sesión con el botón "Acceso Rápido Admin Demo (1 clic)".
2. **Given** la pantalla de login, **When** el usuario pulsa "Acceso Rápido Admin Demo", **Then** el sistema autocompleta `admin@fitstore.pe` y `admin123`, valida el rol de administrador en SQLite y da acceso al Dashboard.
3. **Given** el panel de administración abierto, **When** se examinan los KPIs, **Then** se muestra el total recaudado en Soles (`S/`), el conteo de pedidos pendientes de verificación, el total de productos con indicador de bajo stock y el total de clientes.

---

### User Story 2 - Verificación y Conciliación de Vouchers y Gestión de Pedidos (Priority: P2)

El propietario accede a la **Pestaña de Pedidos y Conciliación**. El sistema presenta una tabla detallada con filtros de estado (`Todos`, `En Verificación`, `Pagado`, `Enviado`, `Entregado`, `Cancelado`). La tabla expone: Código de Orden (`ORD-2026-XXX`), Fecha/Hora, Datos del Cliente (Nombre y DNI de 8 dígitos), Desglose de suplementos, Total en Soles (`S/`), Método de Pago ('Yape', 'Plin', 'Transferencia Bancaria', 'Tarjeta Crédito/Débito'), **Cuenta Destino (`destination_account`)**, N° de Operación bancaria o Código de Autorización (`AUTH-XXXX`), Estado del Pago y Estado del Pedido.
Al hacer clic en **'Ver Voucher / Comprobante'** de un pedido pendiente:
- Se despliega un modal con la imagen del voucher en alta resolución (`payments.voucher_image`), la cuenta receptora exacta del propietario (`destination_account`) y el importe a corroborar.
- El administrador dispone de los botones **'Aprobar Abono en Mi Cuenta'** (actualiza el pago a `'Aprobado'` y la orden a `'Pagado / En Preparación'`) y **'Rechazar Comprobante'** (marca el pago como `'Rechazado'` y la orden como `'Cancelado'`).
- Para pedidos aprobados, el administrador puede modificar el estado de despacho a `'Enviado'` o `'Entregado'`.

**Why this priority**: Es la funcionalidad medular de la cobranza directa, permitiendo al dueño validar que el dinero efectivamente ingresó a su cuenta bancaria o billetera antes de preparar y despachar los suplementos.

**Independent Test**: Realizar una compra por Yape o Transferencia desde la tienda, abrir la pestaña de pedidos en el Panel Admin, pulsar "Ver Voucher", comprobar la visualización de la captura de comprobante y la cuenta destino, pulsar "Aprobar Abono en Mi Cuenta" y verificar que el estado cambie a `'Pagado / En Preparación'` en SQLite.

**Acceptance Scenarios**:
1. **Given** una orden creada por Yape/Plin o Transferencia en estado `'En Verificación'`, **When** el administrador abre la pestaña de Pedidos, **Then** el pedido resalta con una insignia de atención y el botón "Ver Voucher".
2. **Given** el modal de voucher abierto, **When** el administrador revisa la imagen y pulsa "Aprobar Abono en Mi Cuenta", **Then** el registro se actualiza en SQLite con `payment_status: 'Aprobado'` y `order_status: 'Pagado / En Preparación'`.
3. **Given** un comprobante inválido o sospechoso, **When** el administrador pulsa "Rechazar Comprobante", **Then** la orden se actualiza a `'Cancelado'`, el pago a `'Rechazado'`, y el stock de los productos se devuelve automáticamente a la tabla `products`.
4. **Given** un pedido en preparación, **When** el administrador cambia el selector a `'Enviado'` o `'Entregado'`, **Then** la actualización persiste de inmediato en la base de datos SQLite.

---

### User Story 3 - Configuración en Vivo de Cuentas Receptoras del Propietario (Priority: P3)

El propietario accede a la pestaña **'Mis Cuentas Receptoras'**. El formulario carga en tiempo real la fila única de la tabla `store_settings` de SQLite con:
- Nombre Completo del Titular (`owner_name`: `'Jeancarlos José Huertas Quichca'`)
- Número de Celular Yape (`yape_number`: `'924046690'`)
- Número de Celular Plin (`plin_number`: `'983064501'`)
- Entidad Bancaria (`bank_name`: `'BCP - Banco de Crédito del Perú'`)
- Número de Cuenta Corriente / Ahorros en Soles (`bank_account_soles`: `'22079349234041'`)
- Código de Cuenta Interbancario CCI (`bank_cci`: `'00222017934923404128'`)
- Número de WhatsApp para Notificaciones (`whatsapp_notification`: `'983064501'`)
El propietario puede editar cualquiera de estos campos y hacer clic en **'Guardar Configuración de Cobro'**. El sistema valida que los teléfonos tengan 9 dígitos y actualiza SQLite de inmediato, impactando en tiempo real en los datos bancarios, números de copiado, códigos QR y enlaces de WhatsApp que ven los clientes en el Checkout de la tienda.

**Why this priority**: Cumple con el Principio Fundamental III y V de la Constitución, garantizando que el dueño de la tienda pueda auditar y modificar sus cuentas de recaudación en caliente sin requerir cambios de código ni reinicios de servidor.

**Independent Test**: Modificar el número de Yape o la cuenta BCP en la Pestaña 4 de Configuración, guardar los cambios, regresar a la Tienda, abrir el Checkout y verificar que el nuevo número se muestre en la vista de cobro y en el código QR.

**Acceptance Scenarios**:
1. **Given** el panel de administración, **When** el administrador ingresa a "Mis Cuentas Receptoras", **Then** los campos se precargan con la información vigente de `store_settings` de SQLite.
2. **Given** los campos editables, **When** el propietario modifica un número o cuenta y pulsa "Guardar Configuración de Cobro", **Then** se ejecuta la actualización en SQLite y se despliega un mensaje de éxito ("¡Cuentas bancarias actualizadas correctamente!").
3. **Given** las cuentas actualizadas, **When** cualquier cliente abre el modal de Checkout, **Then** se visualizan los nuevos números y titulares para el abono.

---

### User Story 4 - Catálogo y CRUD Completo de Productos, Precios y Stock (Priority: P4)

El administrador accede a la pestaña **'Catálogo de Productos'**. La interfaz expone una tabla dinámica con buscador por nombre o categoría que muestra: miniatura de foto, nombre del producto, categoría fitness ('Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'), precio en Soles (`S/`), inventario actual en stock y etiqueta de destacado.
El administrador cuenta con:
1) **Crear Nuevo Producto**: Modal interactivo que solicita nombre, descripción detallada, selector de categoría, precio en Soles (`S/`), stock inicial (> 0), URL de imagen (con selector de imágenes fitness de muestra) y switch de destacado.
2) **Editar Producto**: Permite ajustar precio, stock, descripción o datos del producto, impactando al instante en la grilla pública de la tienda.
3) **Eliminar Producto**: Permite dar de baja un producto con confirmación de seguridad previa, removiéndolo de SQLite.

**Why this priority**: Permite mantener el catálogo comercial actualizado, crear promociones modificando precios en Soles y reponer existencias de suplementos cuando el stock se agote.

**Independent Test**: Crear un producto nuevo desde el panel admin ("Pre-Entreno C4 Extreme"), editar su precio en Soles, volver a la tienda del cliente y corroborar que el suplemento aparezca disponible para compra con el precio modificado.

**Acceptance Scenarios**:
1. **Given** la pestaña de Catálogo, **When** el administrador pulsa "Nuevo Producto" y completa el formulario, **Then** el producto se inserta en la tabla `products` de SQLite y aparece en la lista.
2. **Given** un producto existente, **When** el administrador pulsa "Editar", modifica el precio a `S/ 199.90` y guarda, **Then** el nuevo precio se refleja inmediatamente en el catálogo público de la tienda.
3. **Given** un producto a eliminar, **When** el administrador confirma la eliminación, **Then** el registro se borra de SQLite y desaparece de la tienda.

---

### User Story 5 - Directorio y Gestión Integral de Clientes (Priority: P5)

El administrador ingresa a la pestaña **'Gestión de Clientes'**. El sistema lista a todos los clientes registrados en la tabla `users` con rol `'client'`. La tabla expone: Nombre Completo, DNI (8 dígitos), Correo Electrónico, Teléfono Celular (9 dígitos), Dirección y Ciudad de despacho, Número Total de Pedidos Realizados y Monto Acumulado Gastado en Soles (`S/`).
El administrador puede:
- **Ver / Editar Datos del Cliente**: Modificar dirección de entrega o número de contacto en caso de actualización reportada por el comprador.
- **Registrar Nuevo Cliente**: Modal para dar de alta clientes manualmente desde el panel de administración con validación estricta de DNI peruano de 8 dígitos y celular de 9 dígitos.

**Why this priority**: Centraliza la cartera de clientes de FitStore Pro, facilitando la atención al cliente, la verificación de historiales de compra y la rectificación de datos para la entrega de suplementos.

**Independent Test**: Consultar la lista de clientes, verificar que muestre el total de pedidos y gasto acumulado en Soles de clientes como "Carlos Mendoza Ríos", editar su teléfono de contacto y comprobar la persistencia en SQLite.

**Acceptance Scenarios**:
1. **Given** la pestaña de Clientes, **When** se carga la vista, **Then** se listan todos los clientes con su DNI, celular, dirección, conteo de órdenes y gasto acumulado en Soles (`S/`).
2. **Given** un cliente en la lista, **When** el administrador edita sus datos y pulsa "Guardar", **Then** los cambios se actualizan en la tabla `users` de SQLite.
3. **Given** la necesidad de crear un cliente, **When** se completa el modal de registro con DNI de 8 dígitos y celular de 9 dígitos, **Then** el nuevo cliente queda registrado y habilitado para compras.

---

### Edge Cases

- **Intento de acceso al panel por usuario sin rol 'admin'**: Si un cliente intenta forzar el acceso al panel sin credenciales de administrador, el sistema debe denegar el acceso y redirigirlo a la Tienda o a la pantalla de login.
- **Aprobación de orden sin comprobante adjunto**: Si una orden llega por una vía manual sin comprobante, el sistema debe alertar al administrador antes de permitir la aprobación, requiriendo confirmación expresa.
- **Eliminación de producto vinculado a pedidos históricos**: Si se elimina un producto que ya tiene compras registradas en `order_items`, el sistema lo da de baja del catálogo activo para compras futuras conservando íntegro su registro histórico en `order_items` con su nombre (`product_name`) y precio unitario (`unit_price`) congelados.
- **Formato inválido en teléfonos de recaudación**: Si el administrador intenta guardar un número de Yape o Plin con menos o más de 9 dígitos numéricos, el formulario debe señalar el error de validación e impedir el guardado.
- **Stock en cero (0 unidades)**: Si el stock de un suplemento llega a cero por compras sucesivas o edición manual, el producto debe exhibir una insignia destacada de "Agotado" tanto en el panel como en la tienda del cliente.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer una vista de autenticación para el Panel de Administración accesible desde el botón persistente "Panel Admin" de la barra superior.
- **FR-002**: La pantalla de login del panel MUST incluir un botón destacado 'Acceso Rápido Admin Demo (1 clic)' que autocomplete las credenciales `admin@fitstore.pe` / `admin123` y otorgue acceso inmediato, persistiendo la sesión en `localStorage` para permitir alternar libremente con la tienda sin desconexiones accidentales.
- **FR-003**: El Panel de Administración MUST exhibir en su pantalla principal un Dashboard con 4 indicadores financieros y operativos en tiempo real:
  1) Total Recaudado en Mis Cuentas en Soles (`S/ XX.XX`).
  2) Pagos Pendientes de Verificación con badge de notificación.
  3) Total de Pedidos y Total de Productos con alerta de bajo stock ($\le 5$ unidades).
  4) Total de Clientes Registrados.
- **FR-004**: El Panel MUST organizarse en 4 pestañas de gestión bien diferenciadas:
  - **Pestaña 1**: Catálogo de Productos y Precios.
  - **Pestaña 2**: Gestión de Pedidos y Verificación de Vouchers.
  - **Pestaña 3**: Gestión de Clientes.
  - **Pestaña 4**: Configurar Mis Cuentas Receptoras.
- **FR-005**: En la **Pestaña 1 (Productos)**, el sistema MUST permitir listar productos en una tabla con buscador por nombre y filtro por categoría ('Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'), resaltando con badge "¡Bajo Stock!" los artículos con $\le 5$ unidades y con badge "Agotado" los que tengan 0 unidades.
- **FR-006**: La Pestaña 1 MUST proveer modales interactivos para:
  - **Crear Producto**: Nombre, descripción, categoría, precio en Soles (`S/`), stock inicial (> 0), URL de imagen y flag de destacado.
  - **Editar Producto / Precio / Stock**: Modificar en caliente cualquier atributo, impactando inmediatamente en la tienda del cliente.
  - **Eliminar Producto**: Dar de baja el producto en SQLite con confirmación previa.
- **FR-007**: En la **Pestaña 2 (Pedidos)**, el sistema MUST listar todas las órdenes registradas en SQLite mostrando: Código de Orden (`ORD-2026-XXX`), Fecha, Cliente (Nombre y DNI), Productos, Total en `S/`, Método de Pago, Cuenta Destino (`destination_account`), N° de Operación o Código de Autorización (`AUTH-XXXX`), Estado del Pago y Estado del Pedido.
- **FR-008**: La Pestaña 2 MUST proveer un modal **'Ver Voucher / Comprobante'** que muestre la imagen del comprobante (`voucher_image` en Base64 o URL), la cuenta receptora del dueño a la que se transfirió (`destination_account`), y botones para **'Aprobar Abono en Mi Cuenta'** y **'Rechazar Comprobante'**.
- **FR-009**: Al aprobar un abono, el sistema MUST actualizar en SQLite `payments.payment_status` a `'Aprobado'` y `orders.order_status` a `'Pagado / En Preparación'`.
- **FR-010**: Al rechazar un comprobante, el sistema MUST actualizar en SQLite `payments.payment_status` a `'Rechazado'`, `orders.order_status` a `'Cancelado'`, y restituir automáticamente las cantidades de cada producto del pedido a la tabla `products` para habilitar su venta inmediata.
- **FR-011**: La Pestaña 2 MUST permitir modificar el estado logístico del pedido a través de un selector rápido para transicionar a `'Enviado'` o `'Entregado'`.
- **FR-012**: En la **Pestaña 3 (Clientes)**, el sistema MUST listar los clientes con Nombre, DNI de 8 dígitos, Correo, Celular de 9 dígitos, Dirección, Ciudad, cantidad de compras y monto total gastado en Soles (`S/`).
- **FR-013**: La Pestaña 3 MUST permitir registrar nuevos clientes manualmente y editar la información de clientes existentes en la tabla `users` de SQLite.
- **FR-014**: En la **Pestaña 4 (Mis Cuentas Receptoras)**, el sistema MUST proveer un formulario enlazado en tiempo real a la tabla `store_settings` de SQLite con los campos:
  - Titular (`owner_name`)
  - Número de Yape (`yape_number`)
  - Número de Plin (`plin_number`)
  - Entidad Bancaria (`bank_name`)
  - Número de Cuenta en Soles (`bank_account_soles`)
  - Código CCI (`bank_cci`)
  - WhatsApp de Notificaciones (`whatsapp_notification`)
- **FR-015**: Al presionar 'Guardar Configuración de Cobro', el sistema MUST validar que los números celulares tengan 9 dígitos numéricos, persistir los cambios en `store_settings` y propagar de inmediato los nuevos datos al Checkout y Footer de la tienda pública sin requerir reinicio del servidor.
- **FR-016**: La interfaz del Panel MUST incluir botones de navegación para regresar a la Tienda del Cliente en 1 clic y para cerrar la sesión administrativa de forma explícita, limpiando la persistencia en `localStorage`.

### Key Entities *(include if feature involves data)*

- **StoreSettings**: Parámetros de recaudación y contacto del propietario (`owner_name`, `yape_number`, `plin_number`, `bank_name`, `bank_account_soles`, `bank_cci`, `whatsapp_notification`, `updated_at`).
- **Product**: Catálogo de nutrición deportiva y gimnasio (`id`, `name`, `description`, `category`, `price`, `stock`, `image_url`, `featured`, `created_at`).
- **Order**: Órdenes de compra registradas (`id`, `order_code`, `user_id`, `customer_name`, `customer_dni`, `customer_phone`, `shipping_address`, `total`, `order_status`, `created_at`).
- **Payment**: Transacciones financieras asociadas (`id`, `order_id`, `method`, `destination_account`, `amount`, `currency`, `operation_number`, `voucher_image`, `card_last4`, `auth_code`, `payment_status`, `created_at`).
- **User**: Administrador y clientes registrados (`id`, `name`, `dni`, `email`, `phone`, `address`, `city`, `role`, `created_at`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede autenticarse en el panel en menos de 2 segundos utilizando el botón de demostración de 1 clic.
- **SC-002**: La aprobación o rechazo de un comprobante de pago en el modal de verificación actualiza los estados en la base de datos SQLite en menos de 500 ms.
- **SC-003**: Las modificaciones realizadas a los precios o stock de productos se reflejan en el catálogo público de la tienda de forma inmediata tras recargar o navegar.
- **SC-004**: La actualización de cuentas bancarias o números de Yape/Plin en la Pestaña 4 se propaga al 100% de los componentes dependientes (CheckoutModal, CartDrawer, Footer) sin reiniciar procesos del backend.
- **SC-005**: El Dashboard financiero calcula con exactitud matemática del 100% el total recaudado en Soles (`S/`) sumando los pagos aprobados.

## Assumptions

- Toda la interfaz administrativa, mensajes y alertas se formulan íntegramente en español de Perú con moneda oficial en Soles (`S/`).
- Las credenciales por defecto del administrador demo son `admin@fitstore.pe` / `admin123`, precargadas durante el auto-seed inicial de SQLite.
- Los cambios realizados en `store_settings` impactan en el registro único de configuración del negocio (`id = 1`).
- La sesión administrativa se preserva en el almacenamiento local del navegador (`localStorage`) para mantener la sesión activa durante las demostraciones.

