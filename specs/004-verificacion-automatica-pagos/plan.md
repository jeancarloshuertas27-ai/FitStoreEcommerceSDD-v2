# Implementation Plan: Módulo 004 - Motor de Verificación Automática e Instantánea de Pagos (Estilo Temu / Shein)

**Branch**: `004-verificacion-automatica-pagos` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

---

## Summary
Reemplazar el flujo de revisión manual de comprobantes por un Motor de Conciliación y Verificación Automática en tiempo real en Node.js/Express y SQLite, con un endpoint unificado `POST /api/payments/auto-verify` que valida códigos OTP de Yape (6 dígitos), referencias bancarias CIP (24h) y tarjetas (Luhn), aplicando prevención estricta de duplicados, transacciones atómicas de stock y una experiencia interactiva en React con modal animado en 3 fases (2.5s) estilo Temu/Shein, con costo cero.

---

## Technical Context

**Language/Version**: JavaScript ECMAScript Modules (ESM), Node.js v24.22.1+  
**Primary Dependencies**: React 18, Vite, Tailwind CSS, Lucide Icons, Express, `node:sqlite` (`DatabaseSync`)  
**Storage**: Relacional en SQLite local (`backend/database.sqlite`) y 100% compatible con Cloudflare D1 (`fitstore-db`)  
**Testing**: Pruebas de integración de endpoints REST y escenarios interactivos de checkout descritos en [quickstart.md](./quickstart.md)  
**Target Platform**: Servidor local Node.js + Navegadores Web modernos (Escritorio y Móvil)  
**Project Type**: Aplicación Web Full-Stack E-Commerce  
**Performance Goals**: Tiempo de verificación en vivo < 3.0s; ejecución del endpoint backend < 50ms  
**Constraints**: \$0.00 en comisiones a intermediarios; cobro directo a las cuentas del dueño (`store_settings`); validación de DNI peruano (8 dígitos) y celular (9 dígitos)  
**Scale/Scope**: Catálogo de suplementos fitness, procesamiento instantáneo de pedidos y panel de administración completo  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Justificación |
|-----------|--------|---------------|
| **I. Arquitectura Full-Stack Unificada** | **PASS** | Frontend en React + Vite + Tailwind + Lucide Icons; backend en Express REST bajo `/api`; SQLite local `database.sqlite` sin dependencias externas. |
| **II. Base de Datos SQLite Autoinicializada** | **PASS** | Opera sobre las 6 tablas existentes (`users`, `products`, `orders`, `order_items`, `payments`, `store_settings`) sin romper el esquema ni el auto-seed. |
| **III. Pagos Dirigidos a Cuentas Reales del Propietario** | **PASS** | Todos los cobros verificados se canalizan y acreditan a las cuentas oficiales de Jeancarlos José Huertas Quichca (Yape `924046690`, Plin `983064501`, BCP `22079349234041`, CCI `00222017934923404128`). *Nota*: El código de autorización de tarjeta extiende el formato base `AUTH-XXXX` a 6 caracteres (`AUTH-XXXXXX`) por homogeneidad con `YAPE-AUTO-XXXXXX` y `CIP-AUTO-XXXXXX`. |
| **IV. Idioma, Localización y Validación para el Perú** | **PASS** | Interfaz y modal animado en español peruano, moneda en Soles (`S/`), validación de celular (9 dígitos) y DNI (8 dígitos). |
| **V. Verificabilidad sin Bloqueos y Experiencia Ágil** | **PASS** | Barra superior persistente, acceso rápido Admin en 1 clic y auditoría completa de hashes bancarios en el Panel de Administración. |

---

## Project Structure

### Documentation (this feature)
```text
specs/004-verificacion-automatica-pagos/
├── spec.md              # Especificación funcional con 5 clarificaciones resueltas
├── plan.md              # Plan técnico de implementación de arquitectura (este archivo)
├── research.md          # Decisiones técnicas y justificación de alternativas
├── data-model.md        # Modelos DTOs, diagrama ER y máquina de estados
├── contracts/           # Contratos REST de la API de pagos y órdenes
│   └── api-contracts.md
├── quickstart.md        # 6 escenarios de verificación extremo a extremo
├── checklists/
│   └── requirements.md  # 16/16 criterios de calidad aprobados
└── tasks.md             # Tareas de implementación ordenadas por fases (Phase 2)
```

### Source Code Modificado y Creado
```text
backend/
├── src/
│   ├── routes/
│   │   ├── payments.js      # NUEVO: Endpoint POST /api/payments/auto-verify y GET /api/payments/audit/:orderCode
│   │   └── orders.js        # ACTUALIZADO: Endpoint POST /api/orders/:id/cancel con reversión de stock
│   ├── db/
│   │   └── seed.js          # ACTUALIZADO: Índices y validación de unicidad en payments
│   └── server.js            # ACTUALIZADO: Registro de rutas de pagos

frontend/
├── src/
│   ├── components/
│   │   ├── AutoVerifyModal.jsx  # NUEVO: Modal animado en 3 fases estilo Temu/Shein
│   │   ├── CheckoutModal.jsx    # ACTUALIZADO: Pestañas conmutables Yape (OTP / QR) y disparador de verificación
│   │   └── AdminPanel.jsx       # ACTUALIZADO: Insignia '✓ Verificado Automáticamente', modal de auditoría y cancelación
│   └── services/
│       └── api.js               # ACTUALIZADO: Métodos autoVerifyPayment, getPaymentAudit y cancelOrder
```

---

## Implementation Phases

### Fase 1: Backend - Endpoint de Verificación y Control Antifraude
1. Crear `backend/src/routes/payments.js` con el endpoint `POST /api/payments/auto-verify`.
2. Implementar la validación de unicidad en SQLite (comprobación de `operation_number` y `auth_code` en `payments`).
3. Implementar la transacción atómica (`BEGIN IMMEDIATE` ... `COMMIT`/`ROLLBACK` en `node:sqlite`): inserción/actualización de `orders`, `order_items`, `payments` con hash bancario (`YAPE-AUTO-XXXXXX`, `CIP-AUTO-XXXXXX`, `AUTH-XXXXXX`), deducción de stock en `products` y expiración automática de reservas CIP mayores a 24 horas (`order_status = 'Expirado'`, liberando stock).
4. Implementar el endpoint `POST /api/orders/:id/cancel` y soporte del estado `'Expirado'` en `backend/src/routes/orders.js` para reversión de inventario.
5. Registrar las rutas en `backend/src/server.js`.

### Fase 2: Frontend - Modal Animado de Verificación en Tiempo Real (Estilo Temu/Shein)
1. Crear `frontend/src/components/AutoVerifyModal.jsx` con secuencia temporal de 2.5s (3 pasos animados, spinners y checks).
2. Conectar las llamadas en `frontend/src/services/api.js` (`autoVerifyPayment`, `getPaymentAudit`, `cancelOrder`).
3. Modificar `frontend/src/components/CheckoutModal.jsx` para añadir las pestañas conmutables de Yape (Pestaña 1 OTP 6 dígitos / Pestaña 2 QR tradicional) y el disparador del modal animado.
4. Integrar el Código CIP de 24 horas para Transferencias Bancarias y la validación de tarjeta con algoritmo de Luhn.

### Fase 3: Frontend - Panel de Administración y Auditoría
1. Actualizar `frontend/src/components/AdminPanel.jsx` para mostrar la insignia `'✓ Verificado Automáticamente'`.
2. Integrar el modal de inspección de auditoría bancaria (hash, canal, cuenta del dueño y fecha).
3. Añadir el botón de cancelación con devolución de stock y los botones de avance logístico (`Enviado` / `Entregado`).

### Fase 4: Verificación y Compilación
1. Ejecutar las pruebas unitarias y de integración de los escenarios descritos en [quickstart.md](./quickstart.md).
2. Validar compilación con `npm run build` garantizando 0 errores.
