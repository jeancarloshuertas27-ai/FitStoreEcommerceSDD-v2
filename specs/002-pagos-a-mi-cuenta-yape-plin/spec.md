# Feature Specification: Módulo 002 - Pasarela de Checkout Dirigida a las Cuentas del Propietario (Yape/Plin, Transferencia y Tarjeta)

**Feature Branch**: `002-pagos-a-mi-cuenta-yape-plin`

**Created**: 2026-11-04

**Status**: Ready for Planning

**Input**: User description: "Implementar el flujo completo de Checkout y Procesamiento de Pagos leyendo dinámicamente los datos de la tabla store_settings de SQLite para que todas las compras de los clientes se envíen directamente al Número de Yape/Plin del propietario, a su Número de Cuenta Bancaria / CCI o se liquiden hacia su Cuenta Recaudadora mediante Tarjeta de Crédito/Débito (Sandbox), registrando la cuenta destino exacta en la tabla payments y permitiendo notificar el voucher al WhatsApp del propietario."

## Clarifications

### Session 2026-11-04
- Q: ¿Qué representación gráfica genera el botón "Cargar Voucher de Prueba / Comprobante Demo"? → A: Genera una imagen Base64 generada mediante Canvas/SVG que simula una constancia bancaria peruana auténtica (Yape, Plin o BCP) con logotipo, fecha/hora actual, importe exacto en Soles (`S/`), N° de operación y nombre del titular (Jeancarlos José Huertas Quichca).
- Q: ¿Cómo se genera el código QR dinámico para Yape y Plin en el checkout? → A: Se renderiza en tiempo real mediante un generador QR vectorial/SVG codificando el número de celular del propietario (`924046690` / `983064501`) y el importe total a cobrar, acompañado de un botón de copiado rápido al portapapeles.
- Q: ¿Cuál es la estructura del mensaje prellenado para el botón "Notificar compra y enviar voucher a mi WhatsApp"? → A: Se construye un enlace con protocolo `https://wa.me/51983064501?text=...` que contiene: Código de orden, Nombre del cliente, DNI, Lista resumida de suplementos, Total en Soles (`S/`), Método de pago y N° de operación o código de autorización `AUTH-XXXX`.
- Q: ¿Cómo opera la pasarela de Tarjeta de Crédito/Débito Sandbox y el aviso de cuenta recaudadora? → A: Permite autocompletar en 1 clic credenciales de prueba (`4242 4242 4242 4242`, fecha futura, CVV `123`, cuotas de 1 a 12), muestra un aviso explícito de acreditación a la cuenta BCP N° `22079349234041` de Jeancarlos Huertas, genera un código `AUTH-XXXX` en 800 ms y marca el pedido automáticamente como `'Pagado / En Preparación'`.
- Q: ¿En qué momento se vacía el carrito de compras del cliente? → A: Inmediatamente después de confirmar la transacción y registrar la orden en SQLite, limpiando tanto el estado reactivo como el almacenamiento local (`localStorage`) para evitar duplicaciones.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pago por Billeteras Digitales Yape y Plin del Propietario (Priority: P1)

El cliente accede al Checkout desde el carrito de compras y visualiza sus datos precargados. Al seleccionar la pestaña de pago con **Yape** o **Plin**, la aplicación consulta dinámicamente los datos de `store_settings` de SQLite y muestra en pantalla: el nombre del titular (`owner_name: 'Jeancarlos José Huertas Quichca'`), el número de teléfono oficial (`yape_number` o `plin_number`) con botón de 'Copiar Número', el código QR dinámico y el importe total a pagar en Soles (`S/`). El cliente ingresa su Número de Operación bancaria (o hace clic en 'Generar N° Operación Demo') y adjunta la captura del comprobante (o pulsa 'Cargar Voucher de Prueba'). Al confirmar la compra, se registra la orden y en la tabla `payments` se asocia la cuenta de cobro del propietario exacta.

**Why this priority**: Es el método de pago más popular, accesible y de acreditación inmediata en el comercio electrónico peruano, canalizando los fondos directamente al titular sin intermediarios.

**Independent Test**: Añadir un suplemento al carrito, abrir el checkout, seleccionar Yape o Plin, usar los botones demo de número de operación y voucher, y validar que la orden se registre en SQLite con la cuenta destino correspondiente (`Yape/Plin: 924046690 (Jeancarlos José Huertas Quichca)`).

**Acceptance Scenarios**:

1. **Given** el carrito con productos y el checkout abierto, **When** el cliente selecciona la pestaña "Yape" o "Plin", **Then** la pantalla muestra el número de celular del dueño, el titular, el código QR y el botón para copiar el número.
2. **Given** la vista de pago con Yape/Plin, **When** el cliente pulsa "Generar N° Operación Demo" y "Cargar Voucher de Prueba", **Then** el campo de operación se autocompleta con un correlativo numérico válido y se previsualiza el voucher generado en Base64.
3. **Given** los datos del voucher completados, **When** el cliente confirma el pago, **Then** se crea la orden en SQLite, el pago se guarda en `payments` con estado `'Pendiente de Verificación'`, y se muestra la Boleta Electrónica.

---

### User Story 2 - Pago por Transferencia Bancaria Directa a Cuenta y CCI (Priority: P2)

El cliente selecciona la modalidad de **Transferencia Bancaria Directa**. La interfaz lee de `store_settings` y exhibe una tarjeta bancaria destacada con la entidad financiera (`bank_name: 'BCP - Banco de Crédito del Perú'`), el titular de la cuenta (`owner_name`), el Número de Cuenta en Soles (`bank_account_soles: '22079349234041'`) con botón 'Copiar N° Cuenta', y el Código de Cuenta Interbancario (`bank_cci: '00222017934923404128'`) con botón 'Copiar CCI'. El cliente ingresa el número de operación y adjunta la constancia de transferencia (o comprobante demo), registrándose en `payments.destination_account` la cuenta bancaria exacta del propietario.

**Why this priority**: Es indispensable para clientes que realizan compras de equipamiento fitness de mayor volumen o que prefieren transferencias entre cuentas BCP u otros bancos vía CCI.

**Independent Test**: Seleccionar Transferencia Bancaria en el checkout, copiar la cuenta con un clic, adjuntar el comprobante y verificar que la orden se cree con la referencia de cuenta bancaria del propietario.

**Acceptance Scenarios**:

1. **Given** el cliente en el paso de pago, **When** selecciona "Transferencia Bancaria", **Then** se muestra la tarjeta bancaria con el Banco BCP, titular, número de cuenta y CCI con botones funcionales de copiado al portapapeles.
2. **Given** los botones de copiado, **When** el cliente presiona "Copiar N° Cuenta" o "Copiar CCI", **Then** el valor se copia al portapapeles y se muestra una confirmación visual instantánea ("¡Copiado!").
3. **Given** la orden confirmada por transferencia, **When** se revisa el registro en SQLite, **Then** `payments.destination_account` almacena `'BCP - Banco de Crédito del Perú Cta: 22079349234041 (Jeancarlos José Huertas Quichca)'`.

---

### User Story 3 - Pasarela de Tarjeta Sandbox con Liquidación a Cuenta Recaudadora (Priority: P3)

El cliente elige pagar con **Tarjeta de Crédito o Débito**. Se presenta un formulario interactivo de pasarela que incluye número de tarjeta, nombre del titular, fecha de caducidad (MM/AA), código CVV y selector de cuotas, junto con un botón 'Autocompletar Tarjeta Sandbox (4242...)'. La interfaz despliega un aviso explícito que certifica: *"El cobro procesado se depositará automáticamente en la cuenta recaudadora N° 22079349234041 de Jeancarlos José Huertas Quichca"*. Al presionar 'Pagar', el sistema aprueba la transacción simulada de inmediato, genera un código de autorización `AUTH-XXXX`, registra la liquidación en la cuenta del propietario y marca el pedido como `'Pagado / En Preparación'`.

**Why this priority**: Proporciona una experiencia de pago instantánea y automatizada con tarjeta de crédito/débito que liquida directamente hacia la cuenta recaudadora del negocio sin requerir verificación manual.

**Independent Test**: Seleccionar Tarjeta, hacer clic en "Autocompletar Tarjeta Sandbox", presionar "Pagar con Tarjeta", y verificar que la transacción se apruebe en 1 segundo generando el código `AUTH-XXXX` y actualizando el pedido a `'Pagado / En Preparación'`.

**Acceptance Scenarios**:

1. **Given** la opción de tarjeta seleccionada, **When** el usuario pulsa "Autocompletar Tarjeta Sandbox (4242...)", **Then** los campos de tarjeta se rellenan con el estándar de pruebas (tarjeta `4242 4242 4242 4242`, fecha futura y CVV `123`).
2. **Given** el formulario de tarjeta completado, **When** el cliente pulsa el botón de cobro, **Then** el sistema simula el procesamiento bancario y genera un código de autorización unívoco en formato `AUTH-XXXX`.
3. **Given** el cobro procesado exitosamente, **When** se almacena en SQLite, **Then** `orders.order_status` se establece en `'Pagado / En Preparación'`, `payments.payment_status` en `'Aprobado'`, y `payments.destination_account` registra la cuenta recaudadora del dueño.

---

### User Story 4 - Boleta Electrónica y Notificación Directa a WhatsApp del Propietario (Priority: P4)

Tras confirmarse la orden por cualquiera de las tres vías de pago, el sistema despliega una **Boleta Electrónica** interactiva que desglosa: código de pedido, fecha y hora, datos del cliente (nombre, DNI, celular y dirección), productos adquiridos, desglose de Subtotal, Envío y Total en Soles (`S/`), y la cuenta receptora del propietario donde ingresaron los fondos. Adicionalmente, incluye un botón destacado **'Notificar compra y enviar voucher a mi WhatsApp'** que abre una conversación directa hacia `https://wa.me/51${whatsapp_notification}` con un mensaje preformateado con todos los detalles de la compra.

**Why this priority**: Otorga certidumbre al cliente con su comprobante digital formal y agiliza la validación y despacho mediante notificación directa al canal de WhatsApp del propietario.

**Independent Test**: Finalizar cualquier pedido, comprobar que se renderice la Boleta Electrónica con el detalle exacto de la cuenta de cobro y verificar que el enlace de WhatsApp apunte al número `983064501` con el mensaje codificado.

**Acceptance Scenarios**:

1. **Given** una compra finalizada, **When** se presenta la pantalla de confirmación, **Then** se renderiza la Boleta Electrónica con código de orden (ej. `ORD-2026-003`), fecha, desglose de suplementos, total y cuenta destino.
2. **Given** la Boleta en pantalla, **When** el usuario pulsa "Notificar compra y enviar voucher a mi WhatsApp", **Then** se abre una ventana hacia WhatsApp (`https://wa.me/51983064501`) con el mensaje detallando el código de pedido, monto y número de operación.
3. **Given** la compra concretada, **When** se revisa el estado del carrito, **Then** los ítems se limpian automáticamente de la memoria y del `localStorage`.

---

### Edge Cases

- **Archivo de voucher pesado o formato incompatible**: Si el usuario sube un archivo que no sea imagen o supere los 5 MB, el sistema debe alertar y no permitir la subida, sugiriendo usar el botón de voucher de prueba.
- **Número de operación bancaria con formato incorrecto**: Si el cliente introduce un número de operación menor a 6 o mayor a 8 dígitos, el campo debe señalar el error de longitud antes de procesar el pago.
- **Intento de checkout con carrito vacío**: Si el usuario accede al checkout sin productos, debe mostrarse una advertencia y redirigir inmediatamente a la tienda.
- **Tarjeta sandbox con fecha expirada**: Si se ingresa una tarjeta con fecha de caducidad en el pasado, el sistema debe denegar la transacción simulada informando que la tarjeta está vencida.
- **Cierre accidental del modal de confirmación**: El cliente siempre puede reabrir su boleta y ver el comprobante emitido desde la vista "Mi Perfil y Mis Pedidos".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST implementar un modal o pantalla interactiva de Checkout accesible desde el botón "Ir a Pagar" del Carrito de Compras.
- **FR-002**: El Checkout MUST dividirse en 2 pasos secuenciales y comprensibles:
  - **Paso 1 (Datos del Comprador)**: Precarga de Nombre, DNI de 8 dígitos, Celular de 9 dígitos, Dirección y Ciudad desde el cliente activo en sesión, con posibilidad de modificarlos para la entrega.
  - **Paso 2 (Selección del Método de Pago)**: Pestañas interactivas para elegir entre: 1) Yape, 2) Plin, 3) Transferencia Bancaria Directa (BCP / CCI), 4) Tarjeta de Crédito/Débito Sandbox.
- **FR-003**: El Checkout MUST consultar en tiempo real los datos vigentes de la tabla `store_settings` de SQLite para poblar el titular (`owner_name`), número de Yape (`yape_number`), número de Plin (`plin_number`), banco (`bank_name`), cuenta en Soles (`bank_account_soles`), CCI (`bank_cci`) y WhatsApp de notificación (`whatsapp_notification`).
- **FR-004**: En la vía de **Yape y Plin**, el sistema MUST mostrar: Titular (`owner_name`), Número móvil (`yape_number` / `plin_number`), botón 'Copiar Número' con feedback visual, código QR dinámico y el monto exacto en Soles (`S/`).
- **FR-005**: En la vía de Yape/Plin, el sistema MUST solicitar:
  - Número de Operación bancaria (6 a 8 dígitos numéricos) con botón 'Generar N° Operación Demo'.
  - Subida de captura del voucher (convirtiendo el archivo a Base64 para guardarlo en `payments.voucher_image`), incluyendo un botón 'Cargar Voucher de Prueba' que genere una imagen/voucher demo en 1 clic.
- **FR-006**: En pagos por Yape/Plin, el sistema MUST registrar en `payments.destination_account` la cadena: `"Yape: " + yape_number + " (" + owner_name + ")"` o `"Plin: " + plin_number + " (" + owner_name + ")"`.
- **FR-007**: En la vía de **Transferencia Bancaria Directa**, el sistema MUST presentar una tarjeta bancaria destacada con: Banco (`bank_name`), Titular (`owner_name`), Número de Cuenta en Soles (`bank_account_soles`) con botón 'Copiar N° Cuenta', y Código Interbancario (`bank_cci`) con botón 'Copiar CCI'.
- **FR-008**: En transferencias bancarias, el sistema MUST solicitar el N° de Operación y la captura de comprobante (con botón 'Cargar Comprobante Demo') y registrar en `payments.destination_account` la cadena: `bank_name + " Cta: " + bank_account_soles + " (" + owner_name + ")"`.
- **FR-009**: En la vía de **Tarjeta de Crédito/Débito Sandbox**, el sistema MUST proveer un formulario interactivo con campos para número de tarjeta (16 dígitos), nombre del titular, fecha de caducidad (MM/AA), código CVV (3 dígitos) y selector de cuotas (1 a 12 cuotas).
- **FR-010**: El formulario de tarjeta MUST incluir un botón destacado 'Autocompletar Tarjeta Sandbox (4242...)' que rellene instantáneamente los campos con credenciales de prueba (`4242 4242 4242 4242`, fecha futura y CVV `123`).
- **FR-011**: El formulario de tarjeta MUST desplegar visiblemente el aviso de seguridad: *"El cobro procesado se depositará automáticamente en la cuenta recaudadora N° {bank_account_soles} de {owner_name}"*.
- **FR-012**: Al presionar 'Pagar con Tarjeta', el sistema MUST procesar el cobro de inmediato, generar una clave de autorización en formato `AUTH-XXXX`, registrar en `payments.destination_account` la cuenta bancaria recaudadora del dueño y marcar el pedido como `'Pagado / En Preparación'` con pago `'Aprobado'`.
- **FR-013**: Al completar cualquier compra, el sistema MUST renderizar la **Boleta Electrónica** detallando código de orden correlativo, fecha, cliente, productos, total en Soles (`S/`) y la cuenta o número de Yape/Plin exacta del propietario donde ingresaron los fondos.
- **FR-014**: La pantalla de la Boleta Electrónica MUST incluir el botón 'Notificar compra y enviar voucher a mi WhatsApp' que abra `https://wa.me/51${whatsapp_notification}` con un mensaje preconstruido que contenga el código de pedido, monto, productos y número de operación.
- **FR-015**: Una vez confirmada la orden, el sistema MUST vaciar automáticamente el carrito de compras en la memoria reactiva y en `localStorage`.

### Key Entities *(include if feature involves data)*

- **StoreSettings**: Parámetros de cobro del propietario (`owner_name`, `yape_number`, `plin_number`, `bank_name`, `bank_account_soles`, `bank_cci`, `whatsapp_notification`).
- **Order**: Órdenes de compra (`id`, `order_code`, `user_id`, `customer_name`, `customer_dni`, `customer_phone`, `shipping_address`, `total`, `order_status`, `created_at`).
- **OrderItem**: Ítems de la orden (`id`, `order_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `subtotal`).
- **Payment**: Transacciones financieras asociadas (`id`, `order_id`, `method`, `destination_account`, `amount`, `currency`, `operation_number`, `voucher_image`, `card_last4`, `auth_code`, `payment_status`, `created_at`).
- **User**: Cliente que realiza la compra (`id`, `name`, `dni`, `email`, `phone`, `address`, `city`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los usuarios pueden completar el flujo de compra utilizando los atajos de demostración (N° operación demo, voucher demo o tarjeta sandbox) en menos de 20 segundos.
- **SC-002**: El 100% de las transacciones registradas en la tabla `payments` consignan la cuenta receptora o número de Yape/Plin exacto del propietario leído dinámicamente desde `store_settings`.
- **SC-003**: La conversión de vouchers a formato Base64 se realiza de forma asíncrona en menos de 500 ms sin bloquear la interfaz de usuario.
- **SC-004**: El botón de notificación a WhatsApp genera el enlace con el número oficial (`983064501`) y el texto preformateado en menos de 100 ms tras hacer clic.
- **SC-005**: La Boleta Electrónica emitida coincide en un 100% con los importes, ítems y datos de entrega registrados en la base de datos SQLite.

## Assumptions

- Todos los cobros y comprobantes se expresan en Soles peruanos (`S/` / PEN).
- El código QR desplegado para Yape y Plin utiliza un renderizador SVG dinámico o endpoint estandarizado que codifica el número telefónico y el importe de la orden.
- Para el entorno Sandbox de tarjeta, cualquier número de tarjeta que inicie con `4242` y tenga fecha futura se aprueba de forma instantánea.
- Si el usuario no sube un voucher manual, los botones de asistencia ("Cargar Voucher de Prueba" / "Cargar Comprobante Demo") generan un canvas SVG/PNG ligero en Base64 que simula una constancia bancaria oficial peruana.
