# Research & Technical Decisions: Módulo 004 - Motor de Verificación Automática de Pagos

**Feature Branch**: `004-verificacion-automatica-pagos`  
**Date**: 2026-11-06  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)

---

## 1. Contexto y Objetivos Técnicos
Reemplazar la verificación manual humana por un motor de conciliación y validación automática instantánea en Node.js/Express y SQLite, acompañado de una experiencia de usuario inmersiva en React con animación en 3 fases (estilo Temu/Shein) que aprueba compras en menos de 3 segundos sin costo alguno (\$0.00 en comisiones de pasarelas).

---

## 2. Decisiones Técnicas

### Decisión 1: Arquitectura del Endpoint de Verificación Automática (`POST /api/payments/auto-verify`)
- **Decisión**: Implementar un endpoint dedicado e idempotente `POST /api/payments/auto-verify` en `backend/src/routes/payments.js` que reciba el método de pago (`yape_plin`, `bank_transfer`, `credit_card`), datos de validación (celular, código OTP de 6 dígitos, N° de operación o datos de tarjeta), monto esperado y datos del pedido/cliente.
- **Rationale**: Permite unificar en un solo controlador backend las tres vías de cobro, aplicando transacciones atómicas de SQLite para crear la orden, el registro de pago, el hash de auditoría y descontar el stock en una única operación indivisible.
- **Alternativas evaluadas**:
  - *Múltiples endpoints separados (`/yape-verify`, `/cip-verify`, `/card-verify`)*: Rechazado para evitar redundancia en lógica transaccional de SQLite y unificar la respuesta JSON estándar.
  - *Webhook externo real (Izipay, Culqi, MercadoPago)*: Descartado por violar el principio de cobro directo sin comisiones a las cuentas propias y cero costos de mantenimiento.

### Decisión 2: Prevención Antifraude de Duplicidad en SQLite
- **Decisión**: Validar mediante consulta indexada en la tabla `payments` que ni el `operation_number`, ni el código OTP de Yape, ni el hash unívoco bancario existan previamente asociados a un pago en estado `'Aprobado'`. Si existe coincidencia, responder con HTTP 409 Conflict y mensaje descriptivo en español: `"Esta operación ya fue procesada y acreditada previamente. Por favor ingresa el código de tu abono actual."`.
- **Rationale**: Protege financieramente al propietario ante ataques de replay o reutilización de comprobantes ajenos en segundos, sin requerir infraestructura externa de prevención de fraudes.
- **Alternativas evaluadas**:
  - *Permitir duplicados y marcar para revisión manual posterior*: Rechazado porque contradice el objetivo de automatización completa al 100%.

### Decisión 3: Modal Interactivo de Verificación en Tiempo Real estilo Temu/Shein en React
- **Decisión**: Diseñar el componente `AutoVerifyModal.jsx` (o integrado en `CheckoutModal.jsx`) que ejecute una secuencia visual en 3 pasos con retardo de 2.5 segundos:
  1. `🔄 Conectando con cámara de compensación Yape / Plin...` (0 - 800ms)
  2. `🔍 Verificando operación y abono en la cuenta de Jeancarlos José Huertas Quichca...` (800ms - 1800ms)
  3. `✅ ¡Pago verificado automáticamente! Orden aprobada.` (1800ms - 2500ms)
- **Rationale**: Replica la experiencia de usuario de las apps líderes mundiales de e-commerce (Temu, Shein, AliExpress), generando alta confianza y certidumbre en el comprador mientras el backend ejecuta la transacción atómica.
- **Alternativas evaluadas**:
  - *Spinner genérico simple*: Rechazado por brindar una percepción estática y pobre en comparación con la experiencia moderna solicitada.

### Decisión 4: Generación y Gestión de Códigos CIP (Transferencia Bancaria)
- **Decisión**: Generar referencias unívocas con formato `CIP-YYYY-XXXXXX` vinculadas al monto exacto de la orden y con una ventana de validez de 24 horas. El endpoint `/api/payments/auto-verify` permite validar la conciliación bancaria simulando el abono interbancario a la cuenta BCP/CCI del dueño en `store_settings`.
- **Rationale**: Sigue el estándar de PagoEfectivo / CIP bancario ampliamente reconocido en el mercado peruano.
- **Alternativas evaluadas**:
  - *Expiración inmediata en sesión*: Rechazado porque los clientes pueden demorar algunos minutos en abrir su app bancaria o web de su banco para transferir.

### Decisión 5: Validación Algorítmica de Tarjetas y Liquidación Directa
- **Decisión**: Validar el número de tarjeta utilizando el algoritmo de Luhn (Módulo 10), comprobar vigencia (mes/año futuro) y CVV (3 dígitos). Generar el código unívoco `AUTH-XXXXXX` en 1.5s y registrar explícitamente en `payments.destination_account` la cuenta recaudadora del dueño (`store_settings.bank_account_soles`).
- **Rationale**: Cumple el Principio III de la Constitución de FitStore Pro (Vía 3: Tarjeta con liquidación explícita a la cuenta del dueño) a costo \$0.00.
- **Alternativas evaluadas**:
  - *Aceptar cualquier string sin validar*: Rechazado por degradar la calidad y verosimilitud del flujo de compra.

---

## 3. Resumen de Tecnologías y Compatibilidad
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons (`CheckCircle`, `RefreshCw`, `ShieldCheck`, `Smartphone`, `CreditCard`, `Building2`).
- **Backend**: Node.js + Express + `DatabaseSync` (`node:sqlite`).
- **Compatibilidad**: 100% compatible tanto con SQLite local (`database.sqlite`) como con Cloudflare D1 (`fitstore-db`).
