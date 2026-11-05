# Implementation Plan: Módulo 002 - Pasarela de Checkout Dirigida a las Cuentas del Propietario

**Branch**: `002-pagos-a-mi-cuenta-yape-plin` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-pagos-a-mi-cuenta-yape-plin/spec.md`

## Summary

Implementar la pasarela integral de Checkout en 2 pasos conectada en tiempo real a `store_settings` de SQLite, permitiendo a los clientes completar sus compras canalizando los pagos directamente hacia las cuentas oficiales del propietario: Vía 1 (Yape y Plin con QR dinámico, botón de copiado de número, N° de operación y voucher en Base64 con generador demo en 1 clic), Vía 2 (Transferencia Bancaria BCP con copiado de número de cuenta y CCI), y Vía 3 (Tarjeta de Crédito/Débito Sandbox con autocompletado en 1 clic, autorización `AUTH-XXXX` y liquidación explícita a la cuenta recaudadora). Al confirmar, el sistema registra la cuenta destino exacta en `payments`, emite la Boleta Electrónica, vacía el carrito y habilita el botón para notificar la compra al WhatsApp oficial (`983064501`).

## Technical Context

**Language/Version**: JavaScript (ES Modules) / React 18+, Node.js >= 18.0.0

**Primary Dependencies**:
- Frontend: `react`, `react-dom`, `lucide-react`, `tailwindcss`, `vite`
- Backend: `express`, `cors`, `node:sqlite` (SQLite embebido)

**Storage**: SQLite (`database.sqlite` con claves foráneas y modo WAL, tabla `store_settings`, `orders`, `order_items`, `payments`)

**Testing**: Escenarios de prueba de extremo a extremo definidos en [quickstart.md](./quickstart.md)

**Target Platform**: Navegadores Web modernos (Desktop y Mobile); backend en Node.js

**Project Type**: Full-Stack Web Application (SPA React + API REST Express)

**Performance Goals**: Generación de voucher demo < 200 ms; procesamiento simulado de tarjeta < 1s; enlace a WhatsApp < 100 ms

**Constraints**:
- Toda la UI en español adaptado al Perú con moneda oficial en Soles (`S/`)
- Lectura dinámica obligatoria de los datos de cobro del propietario desde `store_settings`
- Persistencia completa de `destination_account` y `voucher_image` (Base64) en SQLite
- Vaciado automático del carrito de compras tras confirmar la orden

**Scale/Scope**: 4 vías de pago (Yape, Plin, Transferencia BCP, Tarjeta Sandbox), 1 modal de checkout en 2 pasos, 1 componente de boleta electrónica, integración con WhatsApp

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio I (Arquitectura Full-Stack Unificada)**: ✅ PASS. Frontend React + Vite + Tailwind + Lucide Icons y Backend Express + SQLite.
- **Principio II (Base de Datos SQLite Autoinicializada)**: ✅ PASS. Utiliza las 6 tablas relacionales existentes (`store_settings`, `orders`, `order_items`, `payments`, `users`, `products`).
- **Principio III (Pagos Dirigidos a las Cuentas Reales del Propietario)**: ✅ PASS.
  - Vía 1 (Yape/Plin): Número móvil, titular, QR dinámico, N° de operación y voucher Base64.
  - Vía 2 (Transferencia a Mi Cuenta / CCI): Banco BCP, titular, Cuenta y CCI con botones de copiado y registro exacto en `payments.destination_account`.
  - Vía 3 (Tarjeta Sandbox con Abono a Cuenta Recaudadora): Pasarela interactiva `4242...`, código `AUTH-XXXX` y liquidación explícita a la cuenta del dueño.
- **Principio IV (Idioma y Mercado Peruano)**: ✅ PASS. Moneda en Soles (`S/`), DNI de 8 dígitos, celular de 9 dígitos y textos 100% peruanos.
- **Principio V (Verificabilidad sin Bloqueos)**: ✅ PASS. Botones de demo en 1 clic (N° de op demo, voucher demo, autocompletar tarjeta sandbox) para auditorías inmediatas.

## Project Structure

### Documentation (this feature)

```text
specs/002-pagos-a-mi-cuenta-yape-plin/
├── spec.md              # Especificación funcional y requerimientos de pago
├── checklists/
│   └── requirements.md  # Checklist de validación de calidad de la especificación
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones de QR dinámico, vouchers Base64 y WhatsApp
├── data-model.md        # Modelo de datos y transiciones de payments/orders
├── contracts/
│   └── api-contracts.md # Contratos de endpoints REST para checkout y órdenes
└── quickstart.md        # Guía de pruebas paso a paso para cada vía de cobro
```

### Source Code Layout

```text
frontend/src/
├── components/
│   ├── CheckoutModal.jsx      # Modal de Checkout en 2 pasos con selector de vías de cobro
│   ├── ElectronicReceipt.jsx  # Boleta Electrónica con detalle y botón WhatsApp
│   ├── CartDrawer.jsx         # Integración del botón "Ir a Pagar" con CheckoutModal
│   └── Header.jsx             # Sincronización y navegación
├── utils/
│   └── voucherGenerator.js    # Generador Canvas de vouchers demo en 1 clic (Yape/Plin/BCP)
└── services/
    └── api.js                 # Métodos para crear pedidos y obtener settings

backend/src/
└── routes/
    └── orders.js              # Endpoint POST /api/orders con registro de voucher y cuenta destino
```

**Structure Decision**: El módulo de pagos se implementa directamente sobre la arquitectura full-stack existente, agregando `CheckoutModal.jsx`, `ElectronicReceipt.jsx` y el utilitario `voucherGenerator.js` en el frontend, y robusteciendo la creación de órdenes con pagos en el backend.

## Complexity Tracking

*No se detectan violaciones ni complejidad innecesaria.*
