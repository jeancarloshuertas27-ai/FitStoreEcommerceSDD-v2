# Tasks: Módulo 007 - Mercado Pago (Tarjeta + Yape/Plin) y Tarifas de Envío por Provincia

**Input**: Design documents from `/specs/007-mercadopago-yape-plin-envios/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [api-contracts.md](./contracts/api-contracts.md), [quickstart.md](./quickstart.md)  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration of environment secrets and prerequisites

- [X] T001 [P] Verify and validate presence of `MP_PUBLIC_KEY` and `MP_ACCESS_TOKEN` in `backend/.env` and `.dev.vars`
- [X] T002 [P] Document Cloudflare Workers secrets configuration for `MP_ACCESS_TOKEN` and environment variables in `cloudflare-tienda/wrangler.toml` and `cloudflare-admin/wrangler.toml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema expansion and migrations in SQLite and Cloudflare D1  
**⚠️ CRITICAL**: Must complete before any user story can be implemented

- [X] T003 Setup `shipping_rates` table schema with columns `(id INTEGER PRIMARY KEY AUTOINCREMENT, department TEXT NOT NULL, province TEXT NOT NULL, cost REAL NOT NULL, delivery_days TEXT NOT NULL, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)` and seed initial rates (Ayacucho S/ 8.00, Lima S/ 12.00, Otras Provincias S/ 18.00) in `backend/src/db/seed.js`
- [X] T004 [P] Add `shipping_rates` DDL table creation and initial seed statements to the Cloudflare D1 schema script in `backend/src/db/d1-schema-seed.sql`
- [X] T005 [P] Extend `orders` table with columns `shipping_cost REAL DEFAULT 0.00`, `shipping_department TEXT DEFAULT ''`, `shipping_province TEXT DEFAULT ''`, and `shipping_address TEXT DEFAULT ''` in `backend/src/db/seed.js` and `backend/src/db/d1-schema-seed.sql`
- [X] T006 Ensure UNIQUE constraint and unique index `idx_payments_operation_number` on `payments.operation_number` to guarantee that operation numbers cannot be used more than once in `backend/src/db/seed.js` and `backend/src/db/d1-schema-seed.sql`

**Checkpoint**: Foundation ready - database tables and migration scripts prepared for both SQLite and Cloudflare D1.

---

## Phase 3: User Story 1 - Pago Online con Pasarela Mercado Pago Checkout Pro en Sandbox (Priority: P1) 🎯 MVP

**Goal**: Permitir al cliente pagar su orden de suplementos usando la pasarela oficial Mercado Pago Checkout Pro en Sandbox con liquidación en moneda nacional (`PEN` - Soles `S/`), redirección segura vía `sandbox_init_point`, confirmación dual (retorno frontend + webhook IPN) y descuento atómico de stock.

**Independent Test**: Completar un pedido en Checkout seleccionando Mercado Pago, generar la preferencia en `POST /api/payments/create-preference`, pagar en Mercado Pago Sandbox con tarjeta de prueba Visa, retornar a la tienda con `back_urls.success`, y verificar que el backend confirme el `payment_id` en `https://api.mercadopago.com/v1/payments/{payment_id}`, registrando el pago como `'Aprobado'`, la orden como `'Pagado / En Preparación'`, descontando stock y mostrando la Boleta Electrónica.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement `POST /api/payments/create-preference` endpoint calling Mercado Pago API Preferences with `Authorization: Bearer ${MP_ACCESS_TOKEN}`, `currency_id: 'PEN'`, cart items, shipping cost item, and `back_urls` in `backend/src/routes/payments.js`
- [X] T008 [P] [US1] Implement `POST /api/payments/verify-mercadopago` endpoint to verify `payment_id` against `GET https://api.mercadopago.com/v1/payments/${payment_id}`, atomically verify stock, record payment as `'Aprobado'`, update order to `'Pagado / En Preparación'`, and deduct inventory in `backend/src/routes/payments.js`
- [X] T009 [US1] Implement asynchronous webhook endpoint `POST /api/payments/mercadopago-webhook` (IPN) with idempotent handling to confirm orders if the customer closes the browser before returning in `backend/src/routes/payments.js`
- [X] T010 [P] [US1] Add frontend API client methods `createPreference(orderData)` and `verifyMercadoPago(payload)` in `frontend/src/services/api.js`
- [X] T011 [US1] Implement Mercado Pago selection, redirect handler to `sandbox_init_point`, and return handler on URL parameters `payment_id` / `status=approved` in `frontend/src/components/CheckoutModal.jsx`
- [X] T012 [US1] Display `ElectronicReceipt` modal upon Mercado Pago confirmation showing order code, series B001, item breakdown, shipping cost, and Mercado Pago `operation_number` in `frontend/src/components/ElectronicReceipt.jsx`

**Checkpoint**: User Story 1 is fully functional and can be tested independently as the primary payment gateway.

---

## Phase 4: User Story 2 - Pago Inmediato con Yape / Plin y Validación Antifraude en Backend (Priority: P1)

**Goal**: Permitir al cliente pagar directamente con Yape o Plin ingresando su celular y código OTP de 6 dígitos, validando en backend que el teléfono cumpla `^9\d{8}$`, rechazando códigos triviales/repetidos o números de operación previamente registrados en base de datos, y aprobando transacciones válidas automáticamente.

**Independent Test**: Ingresar en Checkout un celular inválido o un OTP trivial (`123456`, `000000`) y comprobar respuesta HTTP 400. Luego, ingresar celular válido y código legítimo (o botón demo), comprobar aprobación inmediata con estado `'Pagado / En Preparación'`, y verificar que un segundo intento con el mismo código sea rechazado por código 409 (Conflicto / Código duplicado).

### Implementation for User Story 2

- [X] T013 [P] [US2] Implement anti-fraud validator utility validating phone matching verbatim `"^9\\d{8}$"`, OTP matching verbatim `"^\\d{6}$"`, rejecting trivial sequences (`000000`, `111111`, `123456`, `654321`, repeating pairs) and checking database uniqueness against `payments.operation_number` in `backend/src/routes/payments.js`
- [X] T014 [US2] Implement endpoint `POST /api/payments/yape-plin` receiving `{ phone, otp, payment_method, items, shipping, user_id }`, executing the anti-fraud validator, deducting product stock atomically, and creating the approved order in `backend/src/routes/payments.js`
- [X] T015 [P] [US2] Add `payYapePlin(payload)` method to frontend API client in `frontend/src/services/api.js`
- [X] T016 [US2] Implement Yape/Plin payment form with 9-digit phone input, 6-digit OTP input, helper button "Generar Código OTP de Prueba", and live 2-second visual verification in `frontend/src/components/CheckoutModal.jsx`
- [X] T017 [US2] Integrate `ElectronicReceipt` modal upon Yape/Plin approval showing `operation_number` (`YAPE-XXXXXX` / `PLIN-XXXXXX`), customer phone, provincial shipping cost, and download/print action in `frontend/src/components/ElectronicReceipt.jsx`

**Checkpoint**: User Stories 1 AND 2 are both functional and testable independently.

---

## Phase 5: User Story 3 - Gestión de Tarifas de Envío por Provincia en Panel Admin y Checkout (Priority: P2)

**Goal**: Gestionar tarifas departamentales y provinciales de envío (`shipping_rates`) desde el Panel de Administración y permitir al cliente seleccionar su provincia en el Checkout con recálculo dinámico automático del flete sumado al total en Soles (`S/`).

**Independent Test**: Crear o editar una tarifa en el Panel Admin (ej. Lima a S/ 14.00), abrir el Checkout en la tienda, seleccionar Lima y verificar que el costo de envío refleje de inmediato S/ 14.00 y se sume al total de la compra antes de pagar con Mercado Pago o Yape/Plin.

### Implementation for User Story 3

- [X] T018 [P] [US3] Create shipping rates routes module with `GET /api/shipping-rates` (active rates for Checkout) and admin endpoints `GET /api/admin/shipping-rates`, `POST /api/admin/shipping-rates`, `PUT /api/admin/shipping-rates/:id`, and `DELETE /api/admin/shipping-rates/:id` in `backend/src/routes/shippingRates.js`
- [X] T019 [US3] Mount `/api/shipping-rates` routes in backend server in `backend/src/server.js`
- [X] T020 [P] [US3] Add shipping rates API client methods (`getShippingRates`, `getAdminShippingRates`, `createShippingRate`, `updateShippingRate`, `deleteShippingRate`) in `frontend/src/services/api.js`
- [X] T021 [US3] Implement dynamic department and province selector in Checkout with default wildcard option `"Otras Provincias (Nacional - S/ 18.00)"` and real-time total recalculation (`Subtotal + Shipping`) in `frontend/src/components/CheckoutModal.jsx`
- [X] T022 [US3] Implement dedicated "Tarifas de Envío" management tab in Admin Panel with table view, modal to create/edit rates in Soles (`S/`), and toggle active status in `frontend/src/components/AdminPanel.jsx`

**Checkpoint**: All three user stories are completely functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Paridad de Cloudflare Workers / D1, verificación de compilación y pruebas integrales

- [X] T023 [P] Replicate shipping rates endpoints and Yape/Plin anti-fraud logic in Cloudflare Worker entrypoints for edge parity in `cloudflare-tienda/src/index.js` and `cloudflare-admin/src/index.js`
- [X] T024 Verify build compilation without errors by running `npm run build`
- [X] T025 Execute end-to-end verification of all 6 test scenarios defined in `specs/007-mercadopago-yape-plin-envios/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational phase completion.
  - Can proceed sequentially in priority order (US1 → US2 → US3) or in parallel across different files.
- **Polish (Phase 6)**: Depends on completion of all user story implementations.

### User Story Dependencies
- **User Story 1 (P1 - Mercado Pago)**: Depends on Phase 2 database columns (`orders.shipping_cost`, `payments.operation_number`). Independent of US2.
- **User Story 2 (P1 - Yape/Plin Antifraude)**: Depends on Phase 2 database table/indexes. Independent of US1.
- **User Story 3 (P2 - Tarifas de Envío)**: Supplies dynamic rates to Checkout, but US1 and US2 can run with fallback shipping rates during development. Full integration happens when US3 is merged.

---

## Parallel Execution Opportunities

```bash
# Parallel Batch 1: Foundational Database Setup
Task T003: "Setup shipping_rates table schema in backend/src/db/seed.js"
Task T004: "Add shipping_rates DDL to backend/src/db/d1-schema-seed.sql"

# Parallel Batch 2: Endpoints and API client for User Story 1
Task T007: "Implement POST /api/payments/create-preference in backend/src/routes/payments.js"
Task T010: "Add frontend API client methods in frontend/src/services/api.js"

# Parallel Batch 3: User Story 2 & User Story 3 components
Task T013: "Implement anti-fraud validator in backend/src/routes/payments.js"
Task T018: "Create shipping rates routes in backend/src/routes/shippingRates.js"
Task T022: "Implement Tarifas de Envío tab in frontend/src/components/AdminPanel.jsx"
```

---

## Implementation Strategy

### MVP Scope (User Story 1 - Mercado Pago)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational database schemas).
2. Complete Phase 3 (User Story 1: Mercado Pago Preference API, return verification, ElectronicReceipt).
3. Validate User Story 1 independently with test cards in Sandbox.

### Incremental Delivery
1. Foundation: Schemas for shipping rates, orders, and payments ready.
2. Increment 1 (MVP): Mercado Pago Checkout Pro live with test cards.
3. Increment 2: Yape/Plin direct flow live with anti-fraud OTP and duplicate prevention.
4. Increment 3: Shipping rates Admin management and dynamic selector in Checkout.
5. Final Polish: Cloudflare D1 / Worker parity and build verification (`npm run build`).
