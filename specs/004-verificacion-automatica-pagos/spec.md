# Feature Specification: Módulo 004 - Motor de Verificación Automática e Instantánea de Pagos (Estilo Temu / Shein Sin Intervención Manual)

**Feature Branch**: `004-verificacion-automatica-pagos`  
**Created**: 2026-11-06  
**Status**: Draft  
**Input**: User description: "Reemplazar la revisión manual de pagos por un Motor de Conciliación y Verificación Automática en Tiempo Real en el backend (Webhook / Validador Instantáneo), de modo que toda compra realizada con Yape, Plin, Transferencia Bancaria (Banco a Banco) o Tarjeta de Crédito/Débito se verifique y apruebe automáticamente en segundos sin requerir que el Administrador apruebe el pedido manualmente, con costo cero."

---

## Clarifications

### Session 2026-11-06
- Q: ¿Cómo debe presentarse en la interfaz del checkout la elección entre el Código de Aprobación OTP de Yape (estilo Temu) y el escaneo tradicional de QR con N° de operación? → A: Pestañas conmutables dentro de Yape/Plin: Pestaña 1 "Código de Aprobación Yape (6 dígitos)" (predeterminada) y Pestaña 2 "Escanear QR + N° de Operación". Ambas modalidades disparan la verificación automática instantánea en 2.5s.
- Q: ¿Qué valores exactos de estado deben asignarse en la base de datos a order_status y payment_status cuando un pago se verifica automáticamente? → A: Valores estándar order_status = 'Pagado / En Preparación' y payment_status = 'Aprobado', distinguiéndose en la interfaz con el badge '✓ Verificado Automáticamente' a partir del hash bancario único (YAPE-AUTO-, CIP-, AUTH-).
- Q: ¿Cuál debe ser el plazo de vigencia del Código de Pago CIP para transferencias bancarias si el cliente no confirma el pago inmediatamente? → A: Plazo estándar de 24 horas con temporizador regresivo visible en el checkout y comprobante; si no se verifica el abono en dicho periodo, la orden y el CIP expiran automáticamente liberando el stock.
- Q: ¿Qué reglas de validación debe aplicar el backend sobre el Código de Aprobación OTP de 6 dígitos para aprobar la compra en este entorno sin costos de APIs externas? → A: Validación realista antifraude: acepta cualquier código de 6 dígitos numéricos (/^\d{6}$/), rechaza secuencias o dígitos repetidos triviales (000000, 111111) y verifica estrictamente la no duplicidad en la tabla payments de SQLite.
- Q: En el Panel de Administración, ¿qué acciones de gestión debe tener el Administrador disponibles sobre las órdenes verificadas automáticamente? → A: Flujo logístico completo: botones rápidos de despacho para avanzar a "Enviado" y "Entregado", acción secundaria de "Cancelar y Devolver Stock" con reversión atómica de unidades en SQLite y botón "Ver Auditoría" para consultar el comprobante y hash de transacción.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verificación Automática e Instantánea de Yape y Plin (Priority: P1) 🎯 MVP

Como comprador que realiza compras fitness en FitStore Pro usando Yape o Plin, quiero ingresar mi número de celular y mi código de aprobación de 6 dígitos (o número de operación) y experimentar una verificación automática en vivo en segundos, para que mi pedido sea aprobado de inmediato sin esperar que una persona revise manualmente mi comprobante.

**Why this priority**: Yape y Plin representan el método de pago más masivo y preferido en el comercio electrónico del Perú. Eliminar la fricción de la revisión manual y ofrecer una experiencia inmediata estilo Temu/Shein maximiza la conversión y entrega valor tangible desde el primer incremento.

**Independent Test**: Realizar una compra completa en el Checkout seleccionando Yape/Plin, ingresar un celular válido (9 dígitos) y código de aprobación de 6 dígitos; presionar "Pagar Ahora" y verificar que se despliegue el modal con la animación de 3 fases (2.5s), que el backend apruebe la orden automáticamente con código `YAPE-AUTO-XXXXXX`, descuente el stock y emita la boleta electrónica pagada.

**Acceptance Scenarios**:
1. **Given** un carrito con suplementos deportivos y el checkout abierto en el paso de pago,  
   **When** el cliente selecciona "Yape / Plin", ingresa su número celular peruano (9 dígitos) y su Código de Aprobación de 6 dígitos generado en la app de Yape (o escanea el QR del dueño e ingresa la operación), y hace clic en "Pagar Ahora",  
   **Then** el sistema presenta un modal de conexión en vivo con animación secuencial de 3 fases en 2.5 segundos:
     1. `'🔄 Conectando con cámara de compensación Yape / Plin...'`
     2. `'🔍 Verificando operación y abono en la cuenta de Jeancarlos José Huertas Quichca...'`
     3. `'✅ ¡Pago verificado automáticamente! Orden aprobada.'`  
   y actualiza el estado del pago a `'Aprobado'` y del pedido a `'Pagado / En Preparación'` de forma automática.
2. **Given** un código de operación o código de aprobación que ya fue utilizado previamente en otra orden aprobada,  
   **When** el cliente intenta registrar nuevamente dicho código,  
   **Then** el sistema detecta la duplicidad en la base de datos (prevención antifraude) y muestra un mensaje de advertencia impidiendo la aprobación automática sin degradar la aplicación.

---

### User Story 2 - Verificación Automática Banco a Banco con Código CIP / Transferencia (Priority: P2)

Como comprador que prefiere transferir directamente desde su banca por internet o móvil hacia la cuenta BCP o CCI del propietario, quiero que el sistema me asigne una referencia de pago única (código CIP) vinculada a mi monto exacto y valide mi operación automáticamente en tiempo real, para obtener mi comprobante oficial al instante.

**Why this priority**: Muchos clientes corporativos o compradores de suplementos de alto valor prefieren transferencias directas a cuenta o transferencias interbancarias vía CCI. La conciliación instantánea asegura que las transferencias no queden en espera indefinida.

**Independent Test**: Completar un pedido seleccionando "Transferencia Bancaria", verificar la generación del código de referencia CIP vinculado a la cuenta del dueño (`store_settings`), confirmar la transacción bancaria y comprobar que el validador bancario automático apruebe la orden en menos de 2 segundos emitiendo la constancia de abono.

**Acceptance Scenarios**:
1. **Given** un comprador en el checkout que selecciona "Transferencia Bancaria a Cuenta del Propietario",  
   **When** se inicializa el método de pago,  
   **Then** el sistema muestra los datos bancarios del dueño (BCP Soles `22079349234041`, CCI `00222017934923404128`, Titular `Jeancarlos José Huertas Quichca`) y genera un código CIP correlativo único (ej. `CIP-2026-XXXX`) asociado al monto exacto de la orden en Soles (`S/`).
2. **Given** el código CIP asignado y el número de operación ingresado por el comprador,  
   **When** el comprador hace clic en "Verificar Abono Bancario",  
   **Then** el motor de verificación valida la concordancia del monto y la operación bancaria, aprueba la orden automáticamente (`order_status = 'Pagado / En Preparación'`, `payment_status = 'Aprobado'`) y genera la boleta electrónica sin intervención humana.

---

### User Story 3 - Autorización Inmediata con Tarjeta de Crédito/Débito y Liquidación al Dueño (Priority: P3)

Como comprador con tarjeta de débito o crédito bancaria, quiero ingresar los datos de mi tarjeta y experimentar una tokenización y validación algorítmica ultra rápida con liquidación transparente a la cuenta del dueño, para contar con mi confirmación de compra sin demoras.

**Why this priority**: La tarjeta ofrece inmediatez nativa; asegurar que el flujo de tarjeta verifique por algoritmo de Luhn, genere un código de autorización unívoco `AUTH-XXXXXX` y confirme la liquidación a la cuenta del propietario en 1.5 segundos completa el trío de métodos automáticos.

**Independent Test**: Ingresar una tarjeta de prueba estándar en el formulario de checkout, presionar "Pagar con Tarjeta" y validar que en 1.5 segundos se emita la autorización `AUTH-XXXXXX`, se liquide el importe hacia la cuenta recaudadora y la orden pase directamente a estado pagado.

**Acceptance Scenarios**:
1. **Given** los campos de número de tarjeta, fecha de expiración y CVV completados por el cliente,  
   **When** presiona "Pagar Ahora",  
   **Then** el sistema ejecuta la validación algorítmica (Luhn y vigencia) en 1.5 segundos, emite un código de autorización unívoco `AUTH-XXXXXX`, registra la liquidación hacia la cuenta del propietario y aprueba la orden automáticamente.
2. **Given** una tarjeta con fecha de vencimiento expirada o numeración que no supera el algoritmo de validación,  
   **When** se envía el cobro,  
   **Then** el sistema rechaza la transacción con un mensaje instructivo claro en español peruano permitiendo corregir los datos sin perder el contenido del carrito.

---

### User Story 4 - Auditoría y Automatización en el Panel de Administración (Priority: P4)

Como administrador de FitStore Pro, quiero que las compras realizadas por cualquiera de los 3 métodos ingresen directamente con el estado "Pagado / Verificado Automáticamente" y sumen de inmediato al "Total Recaudado en Mis Cuentas", para que ya no tenga que verificar vouchers manualmente y pueda enfocarme 100% en despachar y enviar los pedidos.

**Why this priority**: Automatiza por completo la carga de trabajo administrativa del dueño de la tienda, reduciendo el tiempo de despacho y manteniendo trazabilidad mediante botones de auditoría transparente.

**Independent Test**: Ingresar al Panel de Administración tras procesar compras automáticas y verificar que el contador de pedidos pendientes de verificación esté en 0, que las nuevas órdenes figuren como "Pagado / Verificado Automáticamente" con su hash bancario visible al hacer clic en "Ver Auditoría", y que los botones de acción se enfoquen en "Marcar como Enviado" y "Marcar como Entregado".

**Acceptance Scenarios**:
1. **Given** órdenes completadas a través del motor de verificación automática,  
   **When** el administrador inicia sesión y accede al Panel de Administración,  
   **Then** los pedidos aparecen identificados con la etiqueta verde `'Pagado / Verificado Automáticamente'`, el balance de ventas recaudadas refleja de inmediato los fondos, y la lista de pendientes de revisión manual está vacía.
2. **Given** un pedido verificado automáticamente en la lista de gestión,  
   **When** el administrador presiona el botón "Ver Auditoría / Comprobante",  
   **Then** se despliega una ventana modal con los detalles de conciliación automática: método de cobro, hash bancario (`YAPE-AUTO-XXXXXX` o código de autorización), cuenta de destino del propietario, fecha, hora exacta y desglose de suplementos listos para empaquetar.

---

### Edge Cases

- **Operación duplicada**: Si un usuario malintencionado intenta reutilizar un número de operación bancaria o código de aprobación ya empleado en otra orden aprobada, el backend rechaza la solicitud indicando: `"Esta operación ya fue procesada y acreditada previamente. Por favor ingresa el código de tu abono actual."`
- **Caída o desconexión de red durante los 2.5s de animación**: Si la conexión del cliente se interrumpe durante el modal animado, el backend mantiene la atomicidad de la transacción: o se aprueba y descuenta stock completamente, o se revierte cleanly sin crear estados inconsistentes.
- **Stock insuficiente en el momento de la confirmación**: Si otro usuario adquirió la última unidad de un suplemento mientras el cliente completaba los datos de pago, el validador detecta la falta de inventario antes de generar el hash bancario, evitando cobros indebidos.
- **Formato inválido de código OTP**: Si el cliente ingresa un código de aprobación de Yape de longitud distinta a 6 dígitos o con caracteres alfabéticos, el frontend y backend notifican de inmediato que el código debe contener exactamente 6 dígitos numéricos.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer verificación automática e instantánea para los 3 métodos de cobro oficiales (Yape/Plin, Transferencia Bancaria y Tarjeta) sin requerir aprobación manual por parte del administrador.
- **FR-002**: Para pagos con Yape y Plin, el sistema DEBE disponer de pestañas conmutables: Pestaña 1 "Código de Aprobación Yape (6 dígitos)" (predeterminada, requiriendo celular de 9 dígitos y código OTP de 6 dígitos) y Pestaña 2 "Escanear QR + N° de Operación" (con QR oficial y campo para N° de operación o voucher demo), verificando ambas automáticamente en 2.5s.
- **FR-003**: Durante el procesamiento de Yape/Plin y Transferencia, la interfaz DEBE desplegar un modal interactivo con animación secuencial de progreso (2.5 segundos) reflejando conexión con la cámara de compensación, verificación de abono a nombre de Jeancarlos José Huertas Quichca y aprobación exitosa.
- **FR-004**: El motor backend DEBE validar que el código de aprobación de Yape contenga exactamente 6 dígitos numéricos (`/^\d{6}$/`), rechazar secuencias triviales (`000000`, `111111`) y verificar que ni el código ni el número de operación existan previamente en la tabla `payments` para prevenir fraudes por duplicidad.
- **FR-005**: Ante una verificación exitosa, el sistema DEBE generar un hash/identificador único de transacción (ej. `YAPE-AUTO-XXXXXX` o `CIP-XXXXXX`), actualizar `payment_status` a `'Aprobado'`, cambiar `order_status` a `'Pagado / En Preparación'` y descontar el stock de los productos comprados de forma atómica en SQLite.
- **FR-006**: Para transferencias bancarias, el sistema DEBE generar un código CIP unívoco vinculado al monto exacto de la orden en Soles (`S/`) con vigencia de 24 horas y temporizador visible, verificando automáticamente el abono a la cuenta BCP o CCI del propietario o cancelando la reserva si expira.
- **FR-007**: Para pagos con tarjeta de crédito/débito, el sistema DEBE ejecutar validación algorítmica (Luhn, vigencia y CVV), generar un código de autorización `AUTH-XXXXXX` en un lapso máximo de 1.5 segundos y registrar la liquidación a la cuenta del dueño.
- **FR-008**: El Panel de Administración DEBE registrar en base de datos los estados estándar `order_status = 'Pagado / En Preparación'` y `payment_status = 'Aprobado'`, presentando en la interfaz la insignia `'✓ Verificado Automáticamente'` para todas aquellas órdenes con hash de conciliación automática, incorporando de inmediato los fondos al indicador de ventas recaudadas.
- **FR-009**: El Panel de Administración DEBE proveer un modal de auditoría por pedido donde se consulte el hash de verificación automática, el método utilizado, la cuenta de destino y la fecha y hora de conciliación, así como botones de acción rápida para avanzar el estado a `'Enviado'` y `'Entregado'`, y la opción de cancelación con devolución atómica de stock en SQLite ante reclamos.
- **FR-010**: El sistema DEBE operar con costo cero (\$0.00 en comisiones de pasarelas de terceros), utilizando el motor interno de validación algorítmica y conciliación directa a las cuentas del dueño de la tienda.

---

### Key Entities

- **`PaymentVerificationSession`**: Representa la sesión temporal de validación de pago en tiempo real con su código de verificación (OTP de 6 dígitos o CIP bancario), número de celular origen, monto esperado en Soles (`S/`), estado de validación (`in_progress`, `approved`, `rejected`) y sello temporal.
- **`PaymentAuditRecord`**: Información registrada en la entidad `payments` de SQLite que almacena el hash de transacción unívoco (`YAPE-AUTO-XXXXXX`, `CIP-AUTO-XXXXXX`, `AUTH-XXXXXX`), método de pago, cuenta bancaria receptora del propietario, código de autorización y estado de liquidación inmediata.
- **`AutoVerificationResult`**: Objeto retornado por el backend que certifica la aprobación automática, código correlativo de orden, boleta electrónica digital y estado de stock actualizado.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las órdenes procesadas a través del motor de verificación automática cambian a estado `'Aprobado'` en menos de 3 segundos desde la confirmación del cliente.
- **SC-002**: Reducción del tiempo de espera del cliente para la confirmación de su compra de minutos/horas a 0 segundos (inmediato).
- **SC-003**: Cero órdenes pendientes de verificación manual en el flujo estándar de compra, permitiendo al administrador reducir el tiempo operativo de atención en un 90%.
- **SC-004**: 100% de efectividad en la prevención de fraude por reutilización de números de operación bancaria o códigos de aprobación en SQLite.
- **SC-005**: Costo financiero adicional de procesamiento de transacciones equivalente a \$0.00 (sin comisiones porcentuales de pasarelas intermedias).

---

## Assumptions

- **A-001**: El cliente cuenta con acceso a su aplicación bancaria o billetera móvil (Yape, Plin o banca móvil) para obtener su código de aprobación de 6 dígitos o realizar el abono previo.
- **A-002**: Las cuentas de destino configuradas en `store_settings` (BCP Soles `22079349234041`, CCI `00222017934923404128`, Yape `924046690`, Plin `983064501` a nombre de Jeancarlos José Huertas Quichca) permanecen activas como canales oficiales de recaudación.
- **A-003**: El entorno opera sobre el stack local SQLite y Express con total compatibilidad hacia Cloudflare D1 en la nube.
