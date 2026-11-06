# Implementation Plan: Módulo 005 - Chatbot Asesor Deportivo Inteligente (FitBot)

**Branch**: `005-chatbot-asesor-fitbot` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-chatbot-asesor-fitbot/spec.md`

## Summary

Incorporar un asistente virtual interactivo flotante (**FitBot - Asesor Deportivo**) conectado en tiempo real al catálogo de productos, órdenes y cuentas de cobro en SQLite (`products`, `orders`, `store_settings`). El asistente guía al comprador según sus metas físicas (masa muscular, energía, definición, economía), muestra hasta 3 mini-tarjetas de productos con stock y precio en Soles (`S/`), permite agregar suplementos al carrito directamente desde la conversación sin salir del chat, brinda respuestas inmediatas sobre las cuentas de recaudación oficiales del propietario (Yape, Plin, BCP, CCI) y permite rastrear compras en vivo mediante el DNI de 8 dígitos o código de orden. El motor opera 100% en local y sin depender de servicios externos de pago.

## Technical Context

**Language/Version**: JavaScript (ES Modules) / React 18+, Node.js >= 18.0.0 (Node 24 con `node:sqlite`)

**Primary Dependencies**:
- Frontend: `react`, `react-dom`, `lucide-react`, `tailwindcss`, `vite`
- Backend: `express`, `cors`, `node:sqlite` (SQLite embebido nativo)

**Storage**: SQLite (`database.sqlite` con modo WAL y tablas `products`, `orders`, `order_items`, `store_settings`, `users`)

**Testing**: Escenarios de verificación interactiva de extremo a extremo descritos en [quickstart.md](./quickstart.md)

**Target Platform**: Navegadores Web modernos (Desktop y Mobile); backend en Node.js

**Project Type**: Full-Stack Web Application (SPA React + API REST Express)

**Performance Goals**: Latencia en respuesta conversacional < 100 ms; adición reactiva al carrito < 50 ms; retardo de escritura humanizado de 400 ms

**Constraints**:
- Toda la UI en idioma español adaptado al Perú con moneda oficial en Soles (`S/`).
- DNI peruano de exactamente 8 dígitos y teléfonos de 9 dígitos.
- Cero dependencias de APIs externas de IA generativa (OpenAI, Anthropic, etc.) para garantizar 100% de operatividad autónoma y sin costo.
- No interrumpir el flujo del chat al añadir suplementos al carrito de compras.

**Scale/Scope**: 1 componente flotante principal (`FitBotModal.jsx`), 1 servicio de heurística conversacional (`fitbotService.js`), integración en `App.jsx` y vinculación con `CartContext`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principio I (Arquitectura Full-Stack Unificada y Confiable)**: ✅ PASS. Frontend React + Vite + Tailwind CSS + Lucide Icons; Backend Express + SQLite.
- **Principio II (Base de Datos SQLite Autoinicializada)**: ✅ PASS. FitBot consume directamente los datos de `products`, `orders` y `store_settings` almacenados en `database.sqlite`.
- **Principio III (Pagos Dirigidos a las Cuentas Reales del Propietario)**: ✅ PASS. El botón rápido y las consultas sobre pagos exponen con transparencia el titular (`Jeancarlos José Huertas Quichca`), Yape (`924046690`), Plin (`983064501`), BCP (`22079349234041`) y CCI (`00222017934923404128`).
- **Principio IV (Idioma, Localización y Validación para el Mercado Peruano)**: ✅ PASS. Moneda en Soles (`S/`), validación de DNI peruano de 8 dígitos y teléfonos de 9 dígitos en todos los flujos del chatbot.
- **Principio V (Verificabilidad sin Bloqueos y Experiencia de Usuario Ágil)**: ✅ PASS.
  - Widget flotante no intrusivo con indicador "En línea" y persistencia en `sessionStorage`.
  - Botones de acción rápida de 1 clic para objetivos fitness y métodos de pago.
  - Rastreo directo de órdenes sin fricción.

## Project Structure

### Documentation (this feature)

```text
specs/005-chatbot-asesor-fitbot/
├── spec.md              # Especificación funcional y clarificaciones acordadas
├── checklists/
│   └── requirements.md  # Checklist de calidad de especificación (16/16 Pass)
├── plan.md              # Este plan de implementación
├── research.md          # Decisiones técnicas de IA local, carrito y mobile
├── data-model.md        # Estructura de mensajes, tarjetas, rastreo y máquina de estados
├── contracts/
│   └── api-contracts.md # Contratos de endpoints consumidos por FitBot
└── quickstart.md        # Guía de verificación paso a paso
```

### Source Code Layout

```text
frontend/src/
├── components/
│   ├── FitBotModal.jsx        # Componente del botón flotante y ventana de chat interactiva
│   ├── Header.jsx             # Contador del carrito vinculado a las adiciones de FitBot
│   └── App.jsx                # Montaje de FitBotModal accesible en toda la navegación
├── services/
│   ├── fitbotService.js       # Motor local de coincidencia semántica, intenciones y respuestas
│   └── api.js                 # Métodos para obtener productos, órdenes y store_settings
└── context/
    └── CartContext.jsx        # Gestión del carrito global impactado por '+ Agregar al Carrito'
```

## Complexity Tracking

*No se detectan violaciones arquitectónicas ni complejidad innecesaria.*
