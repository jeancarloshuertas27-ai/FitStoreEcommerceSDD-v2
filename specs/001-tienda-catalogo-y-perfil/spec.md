# Feature Specification: Módulo 001 - Base de Datos SQLite, Catálogo Interactivo, Carrito y Perfil del Cliente

**Feature Branch**: `001-tienda-catalogo-yperfil`

**Created**: 2026-11-04

**Status**: Ready for Planning

**Input**: User description: "Construir la base de datos relacional SQLite completa con auto-seed inicial (incluyendo la configuración de cuentas bancarias y Yape/Plin del titular de la tienda) y el Módulo de Tienda para el cliente: búsqueda de productos en tiempo real, filtros por categoría y precio, modal de detalle de producto, carrito de compras persistente y gestión del Perfil del Cliente (datos personales e historial de pedidos)."

## Clarifications

### Session 2026-11-04
- Q: ¿Cuál es la regla de cálculo para el costo de envío en el Carrito de Compras? → A: Tarifa plana estándar de S/ 10.00 para despachos, con beneficio de "Envío Gratis" automático para órdenes cuyo Subtotal sea igual o superior a S/ 150.00.
- Q: ¿Cómo se maneja la persistencia y sincronización del carrito de compras en el navegador? → A: Mediante almacenamiento local (`localStorage`) sincronizado reactivamente con el estado de la aplicación para resistir recargas y navegación entre vistas.
- Q: ¿Cómo se gestiona el cambio entre clientes de demostración y el registro de nuevos clientes en el Perfil? → A: Se provee un selector rápido en la vista de perfil para alternar entre Cliente 1 (Carlos Mendoza) y Cliente 2 (Valeria Gómez), junto a un formulario para registrar un nuevo cliente que se persiste inmediatamente en la tabla `users` de SQLite.
- Q: ¿Qué alcance tiene el botón "Ir a Pagar (Checkout)" en este Módulo 001? → A: Valida que el carrito tenga productos y stock suficiente, calcula el total consolidado y deja preparado el pedido para la pasarela de pagos y comprobantes bancarios (que se profundizan en el Módulo 002).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exploración y Búsqueda Interactiva en el Catálogo (Priority: P1)

El cliente ingresa a FitStore Pro y visualiza de inmediato la grilla principal de productos de suplementación deportiva y accesorios fitness, con precios en Soles (`S/`), indicadores de unidades en stock y fotografía en alta resolución. El usuario puede realizar búsquedas en tiempo real escribiendo en la barra superior, filtrar por categorías ('Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios') mediante botones tipo píldora y ordenar las tarjetas por precio de forma ágil.

**Why this priority**: Representa el núcleo de la experiencia de compra; sin visibilidad del catálogo no existe flujo comercial posible.

**Independent Test**: Se puede verificar de manera independiente navegando por la tienda, realizando búsquedas de texto como "Creatina" o "Whey" y filtrando por categorías para comprobar que las tarjetas coincidan instantáneamente.

**Acceptance Scenarios**:

1. **Given** el catálogo cargado con los productos iniciales, **When** el cliente escribe un término en el buscador (ej. "Creatina"), **Then** la grilla se actualiza en tiempo real mostrando únicamente los productos coincidentes.
2. **Given** la vista del catálogo, **When** el cliente selecciona una categoría específica (ej. "Proteínas"), **Then** se filtran los productos pertenecientes a dicha categoría y la píldora correspondiente se resalta visualmente.
3. **Given** un conjunto de productos en pantalla, **When** el cliente selecciona ordenar por "Precio: menor a mayor", **Then** la grilla se reorganiza inmediatamente mostrando los productos en orden de precio ascendente.

---

### User Story 2 - Detalle Rápido de Producto y Gestión del Carrito Deslizable (Priority: P2)

El cliente puede pulsar en cualquier tarjeta de producto para abrir una vista rápida modal con especificaciones ampliadas, ajustar la cantidad con controles `-` / `+` y añadir ítems al carrito. Desde el Header, el cliente pulsa el botón de Carrito (que muestra un badge con la cantidad de productos) para desplegar un Drawer lateral donde puede modificar cantidades, borrar ítems y ver el desglose en Soles de Subtotal, Envío (S/ 10.00 o Gratis si Subtotal ≥ S/ 150.00) y Total, manteniendo esta selección persistente ante recargas.

**Why this priority**: Es el paso obligatorio para concretar la intención de compra antes del checkout, permitiendo armar el pedido de manera fluida.

**Independent Test**: Añadir productos al carrito desde la grilla o modal, abrir el drawer lateral, modificar cantidades, eliminar un producto y comprobar que el cálculo del total sea exacto y que persista si se recarga la página.

**Acceptance Scenarios**:

1. **Given** un producto con stock disponible, **When** el cliente selecciona 2 unidades y pulsa "Agregar al Carrito", **Then** el badge del carrito en el Header se incrementa y se muestra una confirmación visual.
2. **Given** el Drawer del Carrito abierto con productos añadidos, **When** el cliente pulsa el botón de eliminar (icono papelera), **Then** el ítem se remueve del listado y el Subtotal, Envío y Total se recalculan en tiempo real.
3. **Given** uno o más productos añadidos al carrito, **When** el cliente refresca el navegador web, **Then** los productos, cantidades y totales del carrito permanecen intactos recuperados desde el almacenamiento local.

---

### User Story 3 - Perfil del Cliente y Consulta de Historial de Pedidos (Priority: P3)

El cliente accede a la vista "Mi Perfil y Mis Pedidos" para consultar y editar sus datos personales de entrega (Nombre completo, DNI de 8 dígitos, Celular de 9 dígitos, Correo electrónico, Dirección y Ciudad) o alternar/crear un nuevo perfil de cliente. Asimismo, puede visualizar su historial cronológico de compras con código de orden, fecha, desglose de ítems, monto total en Soles, cuenta destino del propietario donde se registró el pago y estado actual del pedido.

**Why this priority**: Facilita la confianza y transparencia de la plataforma, permitiendo al cliente revisar sus compras previas y asegurar que sus datos de despacho estén correctos.

**Independent Test**: Modificar los datos de contacto y dirección en el formulario de perfil, guardar los cambios y verificar que se actualicen en la persistencia local de SQLite y se reflejen en sus pedidos.

**Acceptance Scenarios**:

1. **Given** la pantalla de perfil del cliente, **When** el cliente actualiza su número telefónico de 9 dígitos y dirección y guarda los cambios, **Then** el sistema confirma la actualización y almacena los nuevos valores en la base de datos.
2. **Given** un cliente con órdenes registradas, **When** accede a la sección "Mis Pedidos", **Then** visualiza cada orden con su código correlativo, fecha, detalle de productos adquiridos, cuenta de cobro del propietario asociada y estado de verificación/despacho.
3. **Given** la opción de perfiles demo, **When** el usuario selecciona cambiar a otro cliente (Cliente 1 / Cliente 2) o registrar uno nuevo, **Then** el sistema actualiza la sesión activa y carga el historial correspondiente de forma inmediata.

---

### User Story 4 - Auto-Inicialización de la Base de Datos SQLite y Configuración Central (Priority: P4)

Al iniciarse el backend, el sistema verifica automáticamente si la base de datos `database.sqlite` existe y cuenta con el esquema completo. Si no existe, genera las 6 tablas relacionales y precarga datos semilla de alta fidelidad: configuración del titular y cuentas de cobro en `store_settings`, 8 productos fitness con imágenes reales de alta resolución, credenciales del administrador y 2 clientes con pedidos de prueba.

**Why this priority**: Otorga la capacidad de "Zero-Setup", haciendo que la plataforma sea inmediatamente demostrable y verificable desde el primer arranque.

**Independent Test**: Eliminar el archivo SQLite local, iniciar el servidor backend y comprobar que se creen automáticamente las 6 tablas y los registros semilla solicitados.

**Acceptance Scenarios**:

1. **Given** un entorno limpio sin base de datos, **When** arranca el backend, **Then** se crea el archivo `database.sqlite` con las tablas `store_settings`, `users`, `products`, `orders`, `order_items` y `payments`.
2. **Given** la base de datos recién inicializada, **When** se consulta `store_settings`, **Then** se encuentran registrados los datos del titular ('Jeancarlos José Huertas Quichca', Yape `924046690`, Plin `983064501`, BCP `22079349234041`, CCI `00222017934923404128`, WhatsApp `983064501`).
3. **Given** la tabla `products`, **When** se listan sus registros, **Then** contiene exactamente 8 productos con categorías oficiales ('Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'), imágenes reales y precios en Soles entre S/ 45.00 y S/ 249.00.

---

### Edge Cases

- **Búsqueda sin coincidencias**: Si el término ingresado no coincide con ningún producto, la interfaz debe mostrar un estado vacío con mensaje descriptivo ("No encontramos productos que coincidan con tu búsqueda") y un botón para limpiar los filtros.
- **Stock límite alcanzado**: Si el cliente intenta añadir más unidades de las disponibles en inventario, los controles `+` deben desactivarse y mostrar una notificación que indique que se ha alcanzado el stock máximo disponible.
- **Validación de campos obligatorios en Perfil**: Si el usuario introduce un DNI que no contenga exactamente 8 dígitos o un teléfono móvil que no contenga 9 dígitos, el sistema debe señalar el error de formato en el campo y bloquear el guardado.
- **Carrito vacío**: Si el cliente abre el Drawer del Carrito sin productos agregados, se debe presentar una pantalla informativa con llamada a la acción ("Tu carrito está vacío. ¡Explora nuestros suplementos!").
- **Conexión intermitente con el servidor**: Si una consulta de actualización de perfil o carga de productos falla, se debe presentar un mensaje amigable con opción de reintentar sin pérdida de datos en pantalla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST autoinicializar el archivo `database.sqlite` creando 6 tablas relacionales (`store_settings`, `users`, `products`, `orders`, `order_items`, `payments`) al arrancar el backend si no existe.
- **FR-002**: El sistema MUST precargar en `store_settings` los datos oficiales de cobro del titular: `owner_name` ('Jeancarlos José Huertas Quichca'), `yape_number` ('924046690'), `plin_number` ('983064501'), `bank_name` ('BCP - Banco de Crédito del Perú'), `bank_account_soles` ('22079349234041'), `bank_cci` ('00222017934923404128') y `whatsapp_notification` ('983064501').
- **FR-003**: El sistema MUST precargar en `users` 1 usuario Administrador (`admin@fitstore.pe` / `admin123`) y 2 clientes demo, dejando activo por defecto al cliente demo 1 con posibilidad de alternar entre usuarios mediante selector rápido o registrar un nuevo cliente.
- **FR-004**: El sistema MUST precargar en `products` 8 productos fitness con imágenes reales de alta resolución de Unsplash, precios en Soles (`S/`) entre S/ 45.00 y S/ 249.00, categorías asignadas ('Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios') y stock mayor a 15 unidades.
- **FR-005**: El sistema MUST precargar en `orders`, `order_items` y `payments` compras de demostración vinculadas a los clientes demo con diferentes estados de pedido y pago para su inspección inmediata.
- **FR-006**: La aplicación MUST disponer de un Header principal moderno con marca 'FitStore Pro', buscador instantáneo de productos, píldoras de filtrado por categoría, selector de ordenamiento por precio, botón 'Mi Perfil y Mis Pedidos', botón de Carrito con badge dinámico y botón de acceso al 'Panel Admin'.
- **FR-007**: La grilla de productos MUST presentar tarjetas interactivas que incluyan imagen del producto, badge de categoría, nombre, descripción corta, stock disponible en unidades, precio en Soles (`S/`), selector de cantidad con botones `-` / `+`, botón de vista rápida modal y botón 'Agregar al Carrito'.
- **FR-008**: El sistema MUST filtrar el catálogo en tiempo real ante la escritura del cliente en el campo de búsqueda (evaluando coincidencias sobre nombre y descripción).
- **FR-009**: El sistema MUST filtrar el catálogo al pulsar las píldoras de categorías ('Todos', 'Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios').
- **FR-010**: El sistema MUST permitir ordenar el catálogo de productos por precio en orden ascendente y descendente.
- **FR-011**: El sistema MUST contar con un Drawer deslizable de Carrito de Compras que muestre la lista de ítems seleccionados, miniaturas, precio unitario, botones para incrementar/decrementar cantidades y botón de eliminación por ítem.
- **FR-012**: El carrito de compras MUST calcular y actualizar de forma inmediata el Subtotal, el Costo de Envío (S/ 10.00 fija o S/ 0.00 si Subtotal ≥ S/ 150.00) y el Total a pagar en Soles (`S/`).
- **FR-013**: El carrito de compras MUST persistir su contenido mediante almacenamiento local (`localStorage`) en el navegador del cliente para preservar los productos ante recargas accidentales.
- **FR-014**: La aplicación MUST proveer una vista dedicada 'Mi Perfil y Mis Pedidos' que permita al cliente visualizar y editar sus datos personales (Nombre, DNI de 8 dígitos, Celular de 9 dígitos, Correo, Dirección de entrega y Ciudad) con persistencia en SQLite.
- **FR-015**: La vista 'Mi Perfil y Mis Pedidos' MUST permitir alternar entre los clientes demo precargados (Cliente 1 / Cliente 2) o registrar un nuevo perfil de cliente.
- **FR-016**: La vista 'Mi Perfil y Mis Pedidos' MUST listar el historial completo de pedidos del cliente activo, exhibiendo código de orden, fecha, lista de productos comprados, cuenta receptora del propietario a la que se realizó el abono, estado del pago y estado de la orden.

### Key Entities *(include if feature involves data)*

- **StoreSettings**: Parámetros de negocio y cuentas recaudadoras del propietario. Atributos: `id`, `owner_name`, `yape_number`, `plin_number`, `bank_name`, `bank_account_soles`, `bank_cci`, `whatsapp_notification`.
- **User**: Usuarios del sistema clasificados por rol (`client` o `admin`). Atributos: `id`, `name`, `dni`, `email`, `phone`, `address`, `city`, `password`, `role`, `created_at`.
- **Product**: Catálogo de suplementos deportivos y accesorios. Atributos: `id`, `name`, `description`, `category`, `price`, `stock`, `image_url`, `featured`.
- **Order**: Órdenes de compra generadas. Atributos: `id`, `order_code`, `user_id`, `customer_name`, `customer_dni`, `customer_phone`, `shipping_address`, `total`, `order_status`, `created_at`.
- **OrderItem**: Ítems individuales dentro de cada orden. Atributos: `id`, `order_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `subtotal`.
- **Payment**: Transacciones financieras asociadas a una orden. Atributos: `id`, `order_id`, `method`, `destination_account`, `amount`, `currency`, `operation_number`, `voucher_image`, `card_last4`, `auth_code`, `payment_status`, `created_at`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los usuarios pueden encontrar cualquier producto del catálogo en menos de 2 segundos utilizando el buscador en tiempo real o el selector de categorías.
- **SC-002**: El tiempo de respuesta al agregar un ítem, actualizar cantidades o eliminar un producto del carrito y recalcular el total en Soles es instantáneo (inferior a 100 ms).
- **SC-003**: El 100% del estado del carrito de compras se mantiene disponible tras recargar la página o navegar entre las diferentes vistas de la aplicación gracias al almacenamiento local.
- **SC-004**: Los clientes pueden actualizar su perfil de despacho o cambiar de usuario demo en menos de 1 minuto, con validaciones estrictas en tiempo real para DNI de 8 dígitos y celular de 9 dígitos.
- **SC-005**: Al inicializar el sistema por primera vez, el auto-seed de las 6 tablas relacionales y sus registros de demostración se completa en menos de 2 segundos sin errores de integridad referencial.

## Assumptions

- Toda referencia a precios y cobros se expresa en Soles peruanos (`S/` / PEN) con dos decimales.
- El costo de envío en el carrito es de S/ 10.00 fija, siendo gratuito para compras con Subtotal ≥ S/ 150.00.
- El cliente demo 1 se encuentra preseleccionado como usuario activo al iniciar para garantizar una experiencia de prueba fluida desde el primer segundo.
- Las imágenes de catálogo utilizan enlaces directos y estables de Unsplash que representan fielmente suplementos y accesorios fitness.
