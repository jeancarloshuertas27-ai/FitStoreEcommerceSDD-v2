# Implementation Plan: Módulo 003 - Panel de Administración Completo

**Branch**: `003-modulo-administracion` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-modulo-administracion/spec.md`

## Summary

Construir el Módulo de Administración integral de FitStore Pro conectado en tiempo real a SQLite (`database.sqlite`), con autenticación en 1 clic para demostraciones, Dashboard con 4 KPIs financieros/operativos, y 4 pestañas de gestión:
1) **Gestión de Productos y Precios**: CRUD completo de productos con actualización en caliente de precios y stock, y borrado del catálogo activo protegiendo la integridad histórica de pedidos.
2) **Gestión de Pedidos y Verificación de Vouchers**: Listado de pedidos con filtro de estados, modal para auditar vouchers Base64 y la cuenta receptora del dueño (`destination_account`), aprobación de abonos (`'Aprobado'` / `'Pagado / En Preparación'`), rechazo con reversión atómica de stock a `products`, y selector de avance logístico (`'Enviado'` / `'Entregado'`).
3) **Gestión de Clientes**: Directorio con DNI (8 dígitos), compras acumuladas y gasto en Soles (`S/`), con capacidad de editar y crear clientes.
4) **Configurar Mis Cuentas Receptoras**: Formulario en vivo conectado a `store_settings` para auditar y actualizar el nombre de titular (`Jeancarlos José Huertas Quichca`), número de Yape (`924046690`), número de Plin (`983064501`), banco BCP, número de cuenta soles (`22079349234041`), CCI (`00222017934923404128`) y WhatsApp (`983064501`), propagándose de inmediato al Checkout del cliente.

## Technical Context

**Language/Version**: JavaScript (ES Modules) / React 18+, Node.js >= 18.0.0 (Node 24 con `node:sqlite`)

**Primary Dependencies**:
- Frontend: `react`, `react-dom`, `lucide-react`, `tailwindcss`, `vite`
- Backend: `express`, `cors`, `node:sqlite` (SQLite embebido nativo)

**Storage**: SQLite (`database.sqlite` con claves foráneas activadas y modo WAL; tablas `store_settings`, `products`, `orders`, `order_items`, `payments`, `users`)

**Testing**: Escenarios de verificación manual y de extremo a extremo descritos en [quickstart.md](./quickstart.md)

**Target Platform**: Navegadores Web modernos (Desktop y Mobile); backend en Node.js

**Project Type**: Full-Stack Web Application (SPA React + API REST Express)

**Performance Goals**: Latencia en transacciones SQLite < 50 ms; actualización de KPIs < 100 ms; propagación de cambios de precio/cuentas a la tienda < 200 ms

**Constraints**:
- Toda la UI en español adaptado al Perú con moneda oficial en Soles (`S/`).
- Sesión de administrador persistente en `localStorage` con botón explícito de salida.
- Reversión atómica de inventario al rechazar comprobantes de pago.
- Respeto irrestricto a los 5 Principios de la Constitución de FitStore Pro.

**Scale/Scope**: 1 componente maestro de administración (`AdminPanel.jsx`), 1 barra de control en Header, 4 pestañas de gestión, 6 endpoints REST nuevos/mejorados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio I (Arquitectura Full-Stack Unificada)**: ✅ PASS. Frontend React + Vite + Tailwind CSS + Lucide Icons; Backend Express + SQLite.
- **Principio II (Base de Datos SQLite Autoinicializada)**: ✅ PASS. Opera directamente sobre las 6 tablas relacionales existentes en `database.sqlite`.
- **Principio III (Pagos Dirigidos a las Cuentas Reales del Propietario)**: ✅ PASS. Pestaña de pedidos muestra y audita `payments.destination_account`; Pestaña 4 permite modificar en caliente las cuentas de cobro de Jeancarlos Huertas.
- **Principio IV (Idioma y Mercado Peruano)**: ✅ PASS. Moneda en Soles (`S/`), DNI de 8 dígitos numéricos y celulares de 9 dígitos numéricos en todas las vistas de administración.
- **Principio V (Verificabilidad sin Bloqueos y Experiencia de Usuario Ágil)**: ✅ PASS.
  - Barra superior persistente con alternancia fluida entre Tienda, Perfil y Panel Admin.
  - Botón de "Acceso Rápido Admin Demo (1 clic)" con credenciales precargadas (`admin@fitstore.pe` / `admin123`).
  - Pestaña de Configuración Financiera para auditar y actualizar cuentas en caliente.

## Project Structure

### Documentation (this feature)

```text
specs/003-modulo-administracion/
├── spec.md              # Especificación funcional y requerimientos de administración
├── checklists/
│   └── requirements.md  # Checklist de validación de calidad de la especificación
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones técnicas de sesión, stock atómico e integridad
├── data-model.md        # Modelo de datos, flujos de estados y reversión de inventario
├── contracts/
│   └── api-contracts.md # Contratos de endpoints REST para CRUD y administración
└── quickstart.md        # Guía de pruebas paso a paso para auditoría del panel
```

### Source Code Layout

```text
frontend/src/
├── components/
│   ├── AdminPanel.jsx         # Componente maestro del Panel Admin con Dashboard y 4 pestañas
│   ├── Header.jsx             # Sincronización de pestaña activa 'admin' y acceso rápido
│   └── App.jsx                # Coordinación de vista según activeTab ('store' | 'profile' | 'admin')
└── services/
    └── api.js                 # Métodos para CRUD de productos, órdenes, usuarios y settings

backend/src/
└── routes/
    ├── products.js            # Endpoints POST, PUT /:id y DELETE /:id para catálogo
    ├── orders.js              # Endpoints PUT /:id/status y PUT /:id/payment con reversión de stock
    ├── settings.js            # Endpoints GET y PUT para store_settings con validación
    └── users.js               # Enriquecimiento de GET / con conteo de pedidos y gasto acumulado
```

## Complexity Tracking

*No se detectan violaciones arquitectónicas ni complejidad innecesaria.*
