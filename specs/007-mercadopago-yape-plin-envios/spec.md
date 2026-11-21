# Feature Specification: Módulo 007 - Mercado Pago (Tarjeta + Yape/Plin) y Tarifas de Envío por Provincia

**Feature Branch**: `007-mercadopago-yape-plin-envios`  
**Created**: 2026-11-21  
**Status**: Draft  
**Input**: User description: "Integrar Mercado Pago Checkout Pro (API Preferences en Sandbox) usando MP_PUBLIC_KEY y MP_ACCESS_TOKEN desde variables de entorno para pagos con Tarjeta (y Yape/Plin cuando lo habilite la preferencia), complementado con un flujo de Yape/Plin validado en backend (celular de 9 dígitos + código de aprobación OTP de 6 dígitos no trivial ni repetido) para que no se acepten códigos falsos. Agregar en el Panel de Administración un gestor de tarifas de envío por departamento/provincia (shipping_rates) conectado al Checkout del cliente."

---

## Clarifications

### Session 2026-11-21
- Q: ¿Cómo debe el backend confirmar los pagos de Mercado Pago para garantizar que no se pierdan pedidos si el cliente cierra la pestaña? → A: Soporte Dual: Webhook asíncrono (`POST /api/payments/mercadopago-webhook`) + verificación en retorno (`back_urls` con `payment_id`), procesando la confirmación de manera idempotente para no duplicar acciones ni descontar stock dos veces.
- Q: ¿Cómo debe estructurarse la selección de ubicación para el cálculo del costo de envío en el Checkout? → A: Selector de provincias configuradas con opción comodín 'Otras Provincias (Nacional S/ 18.00)' para cobertura inmediata en todo el territorio peruano, permitiendo al Admin agregar o modificar tarifas específicas para cualquier departamento/provincia.
- Q: ¿Qué criterio debe utilizar el backend para determinar si un código OTP de Yape/Plin es válido en este entorno? → A: Criterio Flexible Antifraude: El backend acepta cualquier código numérico de 6 dígitos que cumpla con no ser trivial (sin dígitos idénticos repetidos ni secuencias tipo 123456/654321), no tener patrones repetitivos consecutivos y no existir previamente en la base de datos (SQLite/D1); incluye los códigos generados por el botón asistente y códigos terminados en 88.
- Q: ¿En qué momento debe descontarse el inventario para las compras realizadas con Mercado Pago? → A: Al confirmar pago aprobado: El inventario se descuenta atómicamente únicamente cuando Mercado Pago confirma el estado 'approved' (vía webhook o retorno con `payment_id`), evitando bloqueos o retenciones fantasma de stock por carritos o pasarelas abandonadas sin pagar.
- Q: ¿Qué vista o componente debe mostrarse al cliente inmediatamente después de que un pago es aprobado exitosamente? → A: Boleta Electrónica interactiva (`ElectronicReceipt`): Tanto para pagos aprobados por Mercado Pago como por Yape/Plin, se despliega en pantalla la boleta con el desglose de productos, subtotal, costo de envío provincial, total en Soles (`S/`), número de operación bancario y opciones para descargar/imprimir o retornar a la tienda.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pago Online con Pasarela Mercado Pago Checkout Pro en Sandbox (Priority: P1)

Como cliente registrado o visitante con cuenta en FitStore Pro, quiero pagar mi orden de suplementos usando la pasarela oficial de Mercado Pago (tarjeta de débito/crédito y billeteras digitales habilitadas) mediante una preferencia segura en moneda nacional (PEN - Soles `S/`), para que mi pago sea procesado y verificado automáticamente por la pasarela y mi pedido pase de inmediato al estado "Pagado / En Preparación" con descuento atómico de inventario.

**Why this priority**: Es la pasarela de pagos oficial que brinda confianza bancaria y procesamiento de tarjetas sin exponer credenciales sensibles ni almacenar datos de tarjetas en el servidor de la tienda. Garantiza verificación oficial de pagos vía token/ID de transacción (`payment_id`) contra el API de Mercado Pago.

**Independent Test**: Se puede probar creando un carrito de compras, seleccionando "Mercado Pago (Tarjeta de Crédito / Débito)", generando la preferencia con `POST /api/payments/create-preference`, siendo redirigido al `sandbox_init_point` de Mercado Pago con montos en `PEN`, simulando un pago exitoso con tarjetas de prueba sandbox, retornando a la tienda por `back_urls.success`, y verificando que el backend confirme el `payment_id` en `GET https://api.mercadopago.com/v1/payments/{payment_id}`, registrando el pago como `'Aprobado'` y la orden como `'Pagado / En Preparación'`.

**Acceptance Scenarios**:
1. **Given** un cliente en el Checkout con productos en el carrito y provincia de envío seleccionada, **When** selecciona "Mercado Pago" y pulsa "Pagar con Mercado Pago", **Then** el sistema envía a `POST /api/payments/create-preference` el desglose de productos, datos del cliente y el costo de envío, generando la preferencia en Mercado Pago con `currency_id: 'PEN'` y redirigiendo al cliente a la URL `sandbox_init_point`.
2. **Given** que el cliente completó exitosamente el pago en el Sandbox de Mercado Pago, **When** es redirigido a la tienda vía `back_urls.success` con parámetros `payment_id`, `status=approved` y `external_reference`, **Then** el sistema consulta la API de verificación de Mercado Pago (`https://api.mercadopago.com/v1/payments/{payment_id}`), confirma el monto y estado `approved`, actualiza la orden a `'Pagado / En Preparación'`, registra el pago como `'Aprobado'`, descuenta el stock de los productos comprados y muestra la pantalla de confirmación/boleta electrónica.
3. **Given** un cliente cuyo pago en Mercado Pago fue rechazado o cancelado, **When** retorna a la tienda vía `back_urls.failure` o cancela el flujo, **Then** la orden se mantiene en estado pendiente o cancelada, no se descuenta stock y se muestra un mensaje de error claro invitándolo a intentar con otro medio de pago.

---

### User Story 2 - Pago Inmediato con Yape / Plin y Validación Antifraude en Backend (Priority: P1)

Como comprador en FitStore Pro que desea pagar directamente con su billetera móvil (Yape o Plin), quiero ingresar mi número de celular de 9 dígitos y un código de aprobación OTP de 6 dígitos en el Checkout, para que el sistema valide estrictamente la autenticidad del código en el backend, rechace secuencias falsas/triviales o números de operación previamente usados, y apruebe mi orden automáticamente sin exponer datos bancarios ni requerir aprobación manual demorada.

**Why this priority**: Yape y Plin son las billeteras digitales con mayor penetración en el mercado peruano. Validar estrictamente en backend el número celular (9 dígitos empezando en 9) y el código de aprobación OTP (6 dígitos no repetidos ni triviales) previene intentos de fraude con códigos falsos como `000000` o `123456`, a la vez que proporciona una experiencia de compra inmediata en 1 solo paso.

**Independent Test**: Se puede probar en el Checkout eligiendo la opción "Yape / Plin Directo", ingresando un celular no peruano o inválido (ej. 8 dígitos) o un OTP trivial (`123456`, `000000`) y comprobando que el backend (`POST /api/payments/yape-plin`) responda con error 400 y mensaje explicativo. Luego, ingresando un celular válido (`9XXXXXXXX`) y un OTP generado o terminado en `88`, verificar que el pago se apruebe de inmediato, se registre en SQLite/D1, y que un segundo intento con el mismo código sea rechazado por duplicidad de operación.

**Acceptance Scenarios**:
1. **Given** un comprador en el Checkout que selecciona Yape o Plin, **When** ingresa un número celular que no comienza con `9` o que no tiene 9 dígitos numéricos, **Then** el formulario y el backend rechazan la petición indicando "El número celular debe tener 9 dígitos y comenzar con 9".
2. **Given** un comprador que ingresa un código de aprobación OTP trivial (`000000`, `111111`, `123456`, `654321` o dígitos repetidos), **When** envía la solicitud a `POST /api/payments/yape-plin`, **Then** el backend responde con código HTTP 400 y el mensaje "Código de aprobación inválido o trivial. Ingrese un código OTP legítimo".
3. **Given** un comprador que ingresa un número de operación u OTP que ya fue registrado en una orden anterior en la base de datos (SQLite o Cloudflare D1), **When** intenta procesar el pago, **Then** el backend bloquea la transacción con error 409 indicando "Este número de operación ya fue utilizado en otra transacción".
4. **Given** un comprador que ingresa un celular peruano válido (`9XXXXXXXX`) y un código OTP válido no trivial (o usa el botón asistente "Generar Código OTP de Prueba" para entornos de prueba), **When** confirma el pago, **Then** el backend valida la transacción, registra el pago como `'Aprobado'`, actualiza el pedido a `'Pagado / En Preparación'`, descuenta el stock de inventario y genera la boleta electrónica.

---

### User Story 3 - Gestión de Tarifas de Envío por Departamento/Provincia en Panel Admin y Cálculo Dinámico en Checkout (Priority: P2)

Como administrador de FitStore Pro, quiero configurar y gestionar en una pestaña del Panel Admin las tarifas de envío por departamento y provincia (`shipping_rates`), indicando costo en Soles (`S/`), días estimados de entrega y estado activo/inactivo; y como cliente, quiero seleccionar mi departamento y provincia en el Checkout para que el costo de envío se calcule automáticamente y se sume al total de mi orden.

**Why this priority**: La tienda opera a nivel nacional en Perú. El costo de envío varía según la ubicación geográfica (ej. entrega local en Ayacucho/Huamanga S/ 8.00, Lima Metropolitana S/ 12.00, y otras provincias S/ 18.00). Centralizar las tarifas en base de datos permite flexibilidad logística y cálculo transparente para el cliente antes de procesar el pago en Mercado Pago o Yape/Plin.

**Independent Test**: Se puede probar accediendo al Panel Admin como `admin@fitstore.pe`, abriendo la pestaña "Tarifas de Envío", creando una nueva tarifa o modificando el costo de una provincia existente (ej. Lima a S/ 14.00), luego abriendo la Tienda como cliente, seleccionando esa provincia en el Checkout y verificando que el resumen de compra y la preferencia de pago reflejen inmediatamente los S/ 14.00 de envío sumados al subtotal.

**Acceptance Scenarios**:
1. **Given** el Administrador en el Panel de Administración, **When** ingresa a la pestaña "Tarifas de Envío", **Then** visualiza la tabla completa de tarifas (`shipping_rates`) con departamento, provincia, costo (`S/`), tiempo de entrega y estado (Activo/Inactivo), con opciones para crear, editar y alternar estado.
2. **Given** el Administrador modificando una tarifa existente o creando una nueva, **When** guarda los cambios con monto válido en Soles, **Then** la base de datos (SQLite local y Cloudflare D1) persiste la tarifa de forma atómica y queda disponible al instante en la API pública (`GET /api/shipping-rates`).
3. **Given** un cliente en el Checkout completando sus datos de despacho, **When** selecciona su Departamento y Provincia desde el menú desplegable, **Then** el sistema obtiene la tarifa activa correspondiente, actualiza el valor "Costo de Envío" en el resumen de orden y recalcula el monto Total a pagar (`Subtotal + Envío`).
4. **Given** una orden que se procesa a través de Mercado Pago o Yape/Plin, **When** se crea la orden en backend, **Then** el costo de envío (`shipping_cost`) y la provincia de destino quedan persistidos en el registro de la orden y en el detalle de la boleta de venta.

---

## Edge Cases

- **Cierre prematuro de la pasarela tras pagar**: Si el cliente efectúa el pago exitoso en Mercado Pago y cierra la pestaña antes de redirigirse a la tienda vía `back_urls`, el webhook asíncrono (`POST /api/payments/mercadopago-webhook`) recibe la notificación, verifica el pago en Mercado Pago, aprueba la orden y descuenta el stock de manera idempotente sin requerir la sesión del cliente.
- **Pago Mercado Pago en estado pendiente o en mediación**: Si Mercado Pago retorna estado `in_process` o `pending` tras salir de la pasarela, el backend debe registrar la orden en estado `'Pendiente de Pago'` o `'En Verificación'` y notificar al cliente que su orden se procesará en cuanto la entidad bancaria libere los fondos.
- **Diferencia entre monto de preferencia y monto pagado**: Al verificar el `payment_id` en Mercado Pago, el backend debe comparar que el `transaction_amount` cobrado coincida exactamente con el total de la orden generada; si hay discrepancia, la orden no debe marcarse como pagada y se debe emitir alerta de auditoría.
- **Falla o caída de red con la API de Mercado Pago**: Si al invocar `https://api.mercadopago.com/checkout/preferences` o consultar el `payment_id` hay timeout o error 5xx de Mercado Pago, el backend debe responder con un mensaje amigable al cliente ("No se pudo conectar temporalmente con la pasarela de pagos. Por favor intenta nuevamente o usa Yape/Plin") sin dejar registros corruptos.
- **Códigos OTP repetidos o ataques de fuerza bruta en Yape/Plin**: Si un usuario envía múltiples códigos OTP erróneos o triviales seguidos, el sistema debe bloquear intentos consecutivos y exigir códigos válidos. Si el código OTP ya existe en la tabla `payments` o en órdenes previas, se rechaza inmediatamente evitando reutilización de comprobantes.
- **Provincia sin tarifa asignada o desactivada por el Admin**: Si un cliente elige una localidad cuya tarifa fue desactivada, el Checkout debe mostrar una advertencia clara ("Envíos no disponibles temporalmente para esta provincia. Contacte a soporte") e inhabilitar el botón de pago hasta seleccionar un destino válido.
- **Cambio de provincia tras armar la preferencia**: Si el cliente cambia la provincia de destino en el Checkout, el sistema debe recalcular el total y regenerar la preferencia de Mercado Pago para evitar inconsistencias de montos.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Módulo A: Integración Mercado Pago Checkout Pro (Sandbox)
- **FR-001**: El backend DEBE exponer el endpoint `POST /api/payments/create-preference` protegido y configurado para crear una preferencia de pago en Mercado Pago mediante `https://api.mercadopago.com/checkout/preferences` usando el header `Authorization: Bearer ${MP_ACCESS_TOKEN}`.
- **FR-002**: La preferencia DEBE emitirse obligatoriamente en moneda peruana (`currency_id: 'PEN'`), incluyendo la lista de productos (título, cantidad, precio unitario) y un ítem adicional correspondiente al concepto de flete/envío según la provincia seleccionada por el cliente.
- **FR-003**: La preferencia DEBE configurar `back_urls` válidas apuntando a las rutas del frontend para `success`, `failure` y `pending`, además de `auto_return: 'approved'`.
- **FR-004**: El endpoint DEBE retornar al frontend el identificador de la preferencia (`id`) y la URL de redirección Sandbox (`sandbox_init_point`) utilizando la llave pública `MP_PUBLIC_KEY` para el cliente.
- **FR-005**: El backend DEBE implementar confirmación dual e idempotente para pagos de Mercado Pago: (a) Endpoint `POST /api/payments/verify-mercadopago` consumido por el frontend con el `payment_id` al volver de `back_urls.success`, y (b) Endpoint de webhook asíncrono `POST /api/payments/mercadopago-webhook` (IPN) para recibir notificaciones automáticas si el cliente cierra la pestaña. Ambos validan `GET https://api.mercadopago.com/v1/payments/${payment_id}`.
- **FR-006**: Si la API de Mercado Pago confirma que el estado del pago es `'approved'`, el sistema DEBE de manera atómica: (a) Verificar que exista stock suficiente para todos los ítems, (b) Actualizar la orden a estado `'Pagado / En Preparación'`, (c) Registrar el pago en la tabla `payments` con método `'mercadopago'`, estado `'Aprobado'` y número de operación igual al `payment_id`, y (d) Descontar el stock de los productos comprados. Si no hay stock al momento de la confirmación, la orden pasa a estado de alerta/revisión sin descontar stock negativo.

#### Módulo B: Pago Directo con Yape / Plin con Validación Antifraude
- **FR-007**: El backend DEBE exponer el endpoint `POST /api/payments/yape-plin` para procesar pagos inmediatos mediante billeteras digitales peruanas (Yape y Plin).
- **FR-008**: El endpoint DEBE requerir y validar que el número celular del pagador conste exactamente de 9 dígitos numéricos y comience con el dígito `9` (formato estándar de telefonía móvil en Perú).
- **FR-009**: El endpoint DEBE requerir un código de aprobación OTP de 6 dígitos numéricos.
- **FR-010**: El backend DEBE aplicar reglas estrictas antifraude para rechazar códigos triviales (dígitos idénticos `000000`, `111111`, `222222`, etc.), secuencias ordenadas (`123456`, `654321`) y secuencias repetitivas (`121212`, `123123`).
- **FR-011**: El backend DEBE verificar contra la base de datos (SQLite y Cloudflare D1) que el código de aprobación / número de operación no haya sido utilizado en ninguna orden o pago anterior.
- **FR-012**: El backend DEBE aceptar cualquier código OTP numérico de 6 dígitos que supere la validación antifraude (no trivial y no duplicado en BD), incluyendo los generados por el botón asistente "Generar Código OTP de Prueba" y los códigos terminados en `88`, registrando de inmediato el pago como `'Aprobado'`, la orden como `'Pagado / En Preparación'` y descontando el stock correspondiente.
- **FR-013**: En el Checkout y en el comprobante del cliente NUNCA se deben mostrar números de cuenta privada, datos personales del dueño ni números receptores privados, manteniendo un flujo de pago moderno y despersonalizado.

#### Módulo C: Tarifas de Envío por Departamento y Provincia (`shipping_rates`)
- **FR-014**: El sistema DEBE contar con una tabla relacional `shipping_rates` en SQLite y Cloudflare D1 con las columnas: `id` (INTEGER PRIMARY KEY), `department` (TEXT), `province` (TEXT), `cost` (REAL), `delivery_days` (TEXT), `active` (INTEGER DEFAULT 1), `created_at` (DATETIME).
- **FR-015**: El seed inicial de la base de datos DEBE sembrar tarifas representativas de partida para el mercado peruano:
  - Ayacucho - Huamanga: S/ 8.00 (1 a 2 días hábiles)
  - Lima - Lima Metropolitana: S/ 12.00 (2 a 3 días hábiles)
  - Nacional - Otras Provincias: S/ 18.00 (3 a 5 días hábiles, como opción comodín activa permanente).
- **FR-016**: El backend DEBE exponer endpoints REST:
  - `GET /api/shipping-rates`: Lista todas las tarifas activas para consumo público del Checkout.
  - `GET /api/admin/shipping-rates`: Lista todas las tarifas (activas e inactivas) para el Panel Admin.
  - `POST /api/admin/shipping-rates`: Permite al Administrador registrar una nueva tarifa departamental/provincial.
  - `PUT /api/admin/shipping-rates/:id`: Permite al Administrador actualizar costo en Soles (`S/`), tiempo de entrega y estado activo/inactivo.
  - `DELETE /api/admin/shipping-rates/:id`: Permite eliminar o archivar una tarifa.
- **FR-017**: En el Checkout del cliente, DEBE implementarse un selector interactivo que muestre las provincias con tarifa específica configurada y la opción comodín "Otras Provincias (Nacional - S/ 18.00)". Al seleccionar la ubicación, el sistema DEBE sumar automáticamente el costo de envío al total de la compra antes de invocar cualquier pasarela de pago.
- **FR-018**: El Panel de Administración DEBE incorporar una nueva pestaña dedicada ("Tarifas de Envío") con interfaz gráfica en español para crear, listar, editar costos en Soles y alternar visibilidad de cada tarifa.
- **FR-019**: Tras la aprobación exitosa de cualquier pago (Mercado Pago o Yape/Plin), el frontend DEBE desplegar inmediatamente la Boleta Electrónica interactiva (`ElectronicReceipt`) mostrando serie, desglose de ítems, costo de envío provincial, total en Soles (`S/`), número de operación bancario y opciones para descargar/imprimir o retornar a la tienda.

---

### Key Entities

- **ShippingRate (`shipping_rates`)**:
  - `id`: Identificador único (INTEGER / AUTOINCREMENT).
  - `department`: Nombre del departamento (ej. "Ayacucho", "Lima", "Arequipa").
  - `province`: Nombre de la provincia o zona (ej. "Huamanga", "Lima Metropolitana", "Arequipa").
  - `cost`: Costo de envío expresado en Soles peruanos con dos decimales (ej. 8.00, 12.00).
  - `delivery_days`: Estimación de plazo de entrega (ej. "1 a 2 días hábiles").
  - `active`: Indicador booleano (1 = Activo, 0 = Inactivo).
  - `created_at`: Fecha y hora de registro.

- **Order (`orders`)** *(Ampliación de entidad)*:
  - `id`: Identificador único.
  - `user_id`: Identificador del cliente.
  - `subtotal`: Suma de los precios de los productos en Soles (`S/`).
  - `shipping_cost`: Monto del envío aplicado según la tarifa elegida en Soles (`S/`).
  - `total`: Monto final cobrado (`subtotal + shipping_cost`).
  - `shipping_department`: Departamento de entrega.
  - `shipping_province`: Provincia de entrega.
  - `shipping_address`: Dirección completa de despacho.
  - `status`: Estado de la orden (`'Pendiente'`, `'Pagado / En Preparación'`, `'Enviado'`, `'Entregado'`).
  - `payment_method`: Método empleado (`'mercadopago'`, `'yape'`, `'plin'`).

- **PaymentTransaction (`payments`)** *(Ampliación de entidad)*:
  - `id`: Identificador único.
  - `order_id`: Relación con la orden correspondiente.
  - `payment_method`: Pasarela o método (`'mercadopago'`, `'yape'`, `'plin'`).
  - `operation_number`: Identificador del pago retornado por Mercado Pago (`payment_id`) o código OTP de Yape/Plin validado. DEBE ser único en la tabla.
  - `payer_phone`: Número de celular del cliente (para Yape/Plin).
  - `amount`: Monto total liquidado en Soles (`S/`).
  - `status`: Estado de la transacción (`'Aprobado'`, `'Rechazado'`, `'Pendiente'`).
  - `created_at`: Marca de tiempo de la transacción.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las preferencias de Mercado Pago se generan en moneda `PEN` (Soles) incluyendo la tarifa de envío seleccionada, permitiendo al cliente completar el checkout en Sandbox y ser retornado con verificación exitosa de `payment_id` en menos de 3 segundos tras el redireccionamiento.
- **SC-002**: El backend rechaza el 100% de los códigos OTP de Yape/Plin triviales (`000000`, `123456`, secuencias repetidas) y el 100% de los números de operación previamente registrados en la base de datos, respondiendo con código HTTP 400/409 y mensajes en español claro.
- **SC-003**: Pagos con Yape/Plin con celulares peruanos legítimos (9 dígitos iniciando en 9) y códigos OTP válidos son procesados y aprobados automáticamente en menos de 2 segundos, actualizando la orden a `'Pagado / En Preparación'` e impactando el inventario sin requerir aprobación manual.
- **SC-004**: Los cambios de tarifas de envío realizados por el Administrador en el Panel Admin se propagan de inmediato al Checkout del cliente, recalculando el monto total de manera reactiva en tiempo real al cambiar de provincia.
- **SC-005**: Compatibilidad total garantizada en ambos entornos de persistencia del proyecto: SQLite local (`database.sqlite`) y Cloudflare D1 (`fitstore-db`), manteniendo paridad estricta de esquemas y queries.
- **SC-006**: Ninguna credencial secreta (`MP_ACCESS_TOKEN`) se expone en el cliente ni se commitea al repositorio Git; el frontend interactúa únicamente a través de endpoints seguros y la llave pública `MP_PUBLIC_KEY`.

---

## Assumptions

- Las credenciales de prueba de Mercado Pago están configuradas en `.env` y `.dev.vars` para entornos locales y como secreto encriptado (`MP_ACCESS_TOKEN`) en Cloudflare Workers para producción.
- La moneda oficial y única de todas las transacciones de FitStore Pro es el Sol peruano (`PEN` / `S/`).
- Los clientes ingresan documentos de identidad peruanos (DNI de 8 dígitos) y números de celular nacionales (9 dígitos iniciando en 9).
- Para pruebas de Yape y Plin en entornos locales y demostraciones, el Checkout provee un botón asistente "Generar Código OTP de Prueba" que produce códigos no triviales válidos de 6 dígitos para agilizar las pruebas funcionales.
