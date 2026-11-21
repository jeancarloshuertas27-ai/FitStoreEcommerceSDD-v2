# Implementation Plan: Módulo 007 - Mercado Pago (Tarjeta + Yape/Plin) y Tarifas de Envío por Provincia

**Branch**: `007-mercadopago-yape-plin-envios` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

---

## Summary
Implementar la pasarela oficial de pagos Mercado Pago Checkout Pro (Sandbox en moneda nacional PEN - Soles `S/`) mediante API Preferences y confirmación dual (retorno frontend + webhook IPN asíncrono), complementada con un flujo de pago directo para billeteras digitales peruanas (Yape y Plin) con validación antifraude estricta en backend (celular de 9 dígitos empezando en 9, código OTP de 6 dígitos no trivial ni duplicado), e incorporar un gestor relacional de tarifas de envío por departamento y provincia (`shipping_rates`) en SQLite local y Cloudflare D1 conectado de forma reactiva al Checkout y al Panel de Administración.

---

## Technical Context

**Language/Version**: JavaScript ECMAScript Modules (ESM), Node.js v24.22.1+  
**Primary Dependencies**: React 18, Vite, Tailwind CSS, Lucide Icons, Express, `node:sqlite` (`DatabaseSync`), Cloudflare D1 / Workers  
**Storage**: Relacional en SQLite local (`backend/database.sqlite`) y Cloudflare D1 (`fitstore-db`) con tabla relacional `shipping_rates`  
**Testing**: Pruebas de integración de endpoints REST, simulación Sandbox de Mercado Pago y validación de escenarios descritos en [quickstart.md](./quickstart.md)  
**Target Platform**: Servidor local Node.js + Cloudflare Workers / Pages + Navegadores Web modernos (Escritorio y Móvil)  
**Project Type**: Aplicación Web Full-Stack E-Commerce  
**Performance Goals**: Generación de preferencia de Mercado Pago < 1.5s; verificación antifraude Yape/Plin < 100ms; recálculo reactivo de flete en Checkout < 16ms  
**Constraints**: Moneda oficial en Soles (`PEN` / `S/`), celulares de 9 dígitos peruanos, DNI de 8 dígitos, protección 100% de credenciales secretas (`MP_ACCESS_TOKEN` nunca en frontend ni en Git), cero exposición de cuentas bancarias personales en Checkout  
**Scale/Scope**: Cobertura nacional completa (Ayacucho, Lima y todas las provincias del Perú con comodín de envío) y soporte dual SQLite / Cloudflare D1  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación |
|---|---|---|
| **I. Arquitectura Full-Stack Unificada** | **PASS** | Frontend en React + Vite + Tailwind + Lucide Icons; backend en Express REST bajo `/api`; persistencia en SQLite local y Cloudflare D1 sin romper el stack. |
| **II. Base de Datos SQLite Autoinicializada** | **PASS** | Auto-seed ampliado con la tabla `shipping_rates` (5 localidades de muestra, comodín nacional S/ 18.00) preservando la cuenta única del administrador (`admin@fitstore.pe`). |
| **III. Pagos y Cobros Seguros** | **PASS** | Mercado Pago Checkout Pro maneja tarjetas en Sandbox con liquidación en PEN a la cuenta del comercio; Yape/Plin valida OTP contra fraude; sin exponer datos bancarios personales en el checkout. |
| **IV. Idioma, Localización y Validación para el Perú** | **PASS** | Interfaz íntegra en español peruano, moneda oficial en Soles (`S/`), validación de celular (9 dígitos comenzando en 9) y DNI (8 dígitos). |
| **V. Verificabilidad sin Bloqueos y Experiencia Ágil** | **PASS** | Checkout fluido con cálculo dinámico de flete, botón asistente de prueba OTP para demos, Boleta Electrónica interactiva (`ElectronicReceipt`) y gestión ágil en el Panel Admin. |

---

## Project Structure

### Documentation (this feature)
```text
specs/007-mercadopago-yape-plin-envios/
├── spec.md              # Especificación funcional con 5 clarificaciones resueltas
├── plan.md              # Plan técnico de implementación de arquitectura (este archivo)
├── research.md          # Decisiones técnicas de integración, antifraude y esquemas
├── data-model.md        # Esquema DDL, diagrama ER y máquina de estados
├── contracts/
│   └── api-contracts.md # Contratos REST de pagos (MP, Yape/Plin) y shipping_rates
├── quickstart.md        # 6 escenarios de verificación extremo a extremo
├── checklists/
│   └── requirements.md  # 16/16 criterios de calidad aprobados
└── tasks.md             # Tareas de implementación desglosadas (fase posterior)
```

### Source Code (repository root)
```text
backend/
├── src/
│   ├── db/
│   │   ├── seed.js                   # ACTUALIZADO: Creación y seed de tabla shipping_rates
│   │   └── d1-schema-seed.sql        # ACTUALIZADO: Script DDL de shipping_rates para Cloudflare D1
│   ├── routes/
│   │   ├── payments.js               # ACTUALIZADO: Endpoints create-preference, verify-mercadopago, webhook, yape-plin
│   │   ├── shippingRates.js          # NUEVO: Rutas públicas y administrativas para shipping_rates
│   │   └── orders.js                 # ACTUALIZADO: Soporte para shipping_cost, department y province
│   └── server.js                     # ACTUALIZADO: Registro de rutas /api/shipping-rates
├── .env                              # LOCAL: MP_PUBLIC_KEY y MP_ACCESS_TOKEN (ignorado por Git)
└── .dev.vars                         # CLOUDFLARE: Variables locales de Workers (ignorado por Git)

frontend/
├── src/
│   ├── components/
│   │   ├── CheckoutModal.jsx         # ACTUALIZADO: Selector de provincia, recálculo dinámico y flujos MP / Yape
│   │   ├── AdminPanel.jsx            # ACTUALIZADO: Nueva pestaña 'Tarifas de Envío' (CRUD completo)
│   │   └── ElectronicReceipt.jsx     # ACTUALIZADO: Desglose de flete provincial y número de operación
│   └── services/
│       └── api.js                    # ACTUALIZADO: Métodos createPreference, verifyMercadoPago, payYapePlin, shippingRates API
```

---

## Implementation Phases

### Phase 0: Research & Alignment (Completada)
- [x] Análisis del API de Preferencias de Mercado Pago Sandbox en moneda `PEN`.
- [x] Definición del algoritmo de validación antifraude para códigos OTP y números celulares peruanos.
- [x] Diseño del modelo relacional para tarifas de envío y opción comodín nacional.
- [x] Documentación en [research.md](./research.md).

### Phase 1: Design & Contracts (Completada)
- [x] Modelo de datos relacional y diagrama ER documentado en [data-model.md](./data-model.md).
- [x] Contratos OpenAPI/REST documentados en [api-contracts.md](./contracts/api-contracts.md).
- [x] Guía de pruebas y verificación de 6 escenarios en [quickstart.md](./quickstart.md).
- [x] Actualización de la lista de verificación de calidad.

### Phase 2: Tasks Breakdown & Implementation (Próximo paso: `$speckit-tasks`)
- Desglose ordenado por dependencias de backend (BD + rutas + antifraude) y frontend (Checkout + Admin + Boleta).
