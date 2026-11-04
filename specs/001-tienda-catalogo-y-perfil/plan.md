# Implementation Plan: Módulo 001 - Base de Datos SQLite, Catálogo Interactivo, Carrito y Perfil del Cliente

**Branch**: `001-tienda-catalogo-yperfil` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tienda-catalogo-y-perfil/spec.md`

## Summary

Implementar la base de datos relacional SQLite local con auto-seed automático en frío (creación de 6 tablas relacionales y precarga de 8 productos fitness con fotos de Unsplash, usuario admin, 2 clientes demo y configuración del propietario en `store_settings`). Construir la API REST en Node.js + Express con CORS sin bloqueos y el cliente web en React + Vite + Tailwind CSS + Lucide Icons con catálogo interactivo (búsqueda en tiempo real, filtros por categoría y ordenamiento), modal de vista rápida de producto, drawer deslizable de carrito persistente en `localStorage` y módulo de Perfil del Cliente con edición de datos personales e historial de pedidos.

## Technical Context

**Language/Version**: JavaScript (ES Modules) / Node.js >= 18.0.0, React 18+

**Primary Dependencies**:
- Frontend: `react`, `react-dom`, `vite`, `tailwindcss`, `lucide-react`
- Backend: `express`, `better-sqlite3`, `cors`

**Storage**: SQLite (`database.sqlite` local con claves foráneas activas `PRAGMA foreign_keys = ON;` y `PRAGMA journal_mode = WAL;`)

**Testing**: Escenarios de verificación end-to-end descritos en [quickstart.md](./quickstart.md)

**Target Platform**: Web Browsers (Chrome, Edge, Firefox, Safari) responsivo en Desktop y Móvil; backend en Node.js sobre Windows/Linux/macOS

**Project Type**: Full-Stack Web Application (Frontend React SPA + Backend API REST)

**Performance Goals**: Búsqueda en catálogo < 2s; reactividad de carrito y drawer < 100ms; auto-seed en arranque < 2s

**Constraints**:
- Toda la UI en español de Perú con moneda oficial en Soles (`S/`)
- Validación estricta de DNI (8 dígitos) y Celular (9 dígitos)
- Cero configuración externa previa (Zero-Setup): `database.sqlite` se autoinicializa al ejecutar `npm run dev`

**Scale/Scope**: 6 tablas relacionales, 8 productos semilla, 1 administrador, 2 clientes demo con historial de órdenes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio I (Arquitectura Full-Stack Unificada y Confiable)**: ✅ PASS. Frontend React + Vite + Tailwind CSS + Lucide Icons; Backend Express + SQLite + CORS habilitado.
- **Principio II (SQLite Autoinicializada con Auto-Seed)**: ✅ PASS. Auto-seed programado en el arranque del servidor para 6 tablas relacionales (`store_settings`, `users`, `products`, `orders`, `order_items`, `payments`) con 8 productos reales y datos demo.
- **Principio III (Pagos Dirigidos a Cuentas Reales del Propietario)**: ✅ PASS. La tabla `store_settings` almacena los datos de Jeancarlos Huertas (Yape `924046690`, Plin `983064501`, BCP `22079349234041`, CCI `00222017934923404128`), reflejados en el historial de pedidos y listos para la pasarela de pagos.
- **Principio IV (Idioma y Mercado Peruano)**: ✅ PASS. Interfaz 100% en español de Perú, moneda `S/`, DNI 8 dígitos y móvil 9 dígitos.
- **Principio V (Verificabilidad sin Bloqueos)**: ✅ PASS. Header persistente con conmutación ágil entre Tienda, Perfil/Pedidos y acceso directo al Panel Admin.

## Project Structure

### Documentation (this feature)

```text
specs/001-tienda-catalogo-y-perfil/
├── spec.md              # Especificación funcional y de negocio
├── checklists/
│   └── requirements.md  # Checklist de validación de calidad de la especificación
├── plan.md              # Plan de implementación y arquitectura técnica
├── research.md          # Decisiones tecnológicas y análisis de alternativas
├── data-model.md        # Modelo de datos, entidades, relaciones y semillas
├── contracts/
│   └── api-contracts.md # Contratos de endpoints REST del backend
└── quickstart.md        # Guía paso a paso para validación de la feature
```

### Source Code Layout

```text
backend/
├── src/
│   ├── db/
│   │   ├── database.js     # Conexión better-sqlite3 y configuración WAL
│   │   └── seed.js         # Script de autoinicialización y datos semilla
│   ├── routes/
│   │   ├── products.js     # Rutas de catálogo y detalle
│   │   ├── users.js        # Rutas de perfil y clientes
│   │   ├── orders.js       # Rutas de pedidos e historial
│   │   └── settings.js     # Rutas de configuración de la tienda
│   └── server.js           # Servidor Express, CORS y montaje de rutas
├── database.sqlite         # Base de datos local autogenerada
└── package.json

frontend/
├── index.html
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Barra superior con buscador, badge y navegación
│   │   ├── ProductCard.jsx     # Tarjeta de producto con foto, precio y controles
│   │   ├── ProductModal.jsx    # Modal de vista rápida y especificaciones
│   │   ├── CartDrawer.jsx      # Drawer deslizante de carrito con cálculos
│   │   └── ProfileView.jsx     # Vista de datos personales e historial de pedidos
│   ├── context/
│   │   ├── CartContext.jsx     # Estado del carrito persistido en localStorage
│   │   └── UserContext.jsx     # Estado del usuario activo y perfiles demo
│   ├── services/
│   │   └── api.js              # Cliente de llamadas fetch al backend REST
│   ├── App.jsx                 # Componente principal y conmutador de vistas
│   ├── main.jsx                # Punto de entrada de React Vite
│   └── index.css               # Estilos globales y Tailwind CSS
├── tailwind.config.js
├── vite.config.js
└── package.json

package.json                    # Script raíz con concurrently para npm run dev
```

**Structure Decision**: Arquitectura web desacoplada en `backend/` y `frontend/` coordinada desde un `package.json` raíz que permite ejecutar `npm install` y `npm run dev` en un solo comando sin fricciones.

## Complexity Tracking

*No se detectan violaciones a la constitución ni patrones de complejidad innecesaria.*
