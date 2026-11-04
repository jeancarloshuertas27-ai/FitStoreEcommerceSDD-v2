# Tasks: Módulo 001 - Base de Datos SQLite, Catálogo Interactivo, Carrito y Perfil del Cliente

**Input**: Design documents from `/specs/001-tienda-catalogo-y-perfil/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/api-contracts.md`, `quickstart.md`)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `data-model.md`, `contracts/api-contracts.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Ejecutable en paralelo (archivos independientes, sin dependencias bloqueantes)
- **[Story]**: Mapeo a la historia de usuario correspondiente (`US1`, `US2`, `US3`, `US4`)
- Rutas de archivo absolutas o relativas al repositorio según la arquitectura definida en `plan.md`

---

## Phase 1: Setup (Infraestructura Compartida)

**Purpose**: Inicialización del proyecto full-stack y estructura base de carpetas.

- [x] T001 Crear estructura de directorios del proyecto para `backend/src/` (`db/`, `routes/`) y `frontend/src/` (`components/`, `context/`, `services/`) según el plan de arquitectura
- [x] T002 Inicializar `package.json` raíz con scripts de concurrencia (`concurrently`) para arrancar backend y frontend con un solo comando `npm run dev`
- [x] T003 [P] Configurar `backend/package.json` con dependencias base (`express`, `better-sqlite3`, `cors`) y soporte para ES Modules
- [x] T004 [P] Configurar `frontend/package.json` con dependencias (`react`, `react-dom`, `lucide-react`, `tailwindcss`, `vite`), `vite.config.js`, `tailwind.config.js` y `postcss.config.js`

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes - Base de Datos y Motor REST)

**Purpose**: Infraestructura central de SQLite y servidor Express que debe estar lista antes de las historias de usuario.

**⚠️ CRITICAL**: Ninguna historia de usuario puede arrancar hasta completar esta fase.

- [x] T005 Configurar la conexión SQLite en `backend/src/db/database.js` habilitando claves foráneas (`PRAGMA foreign_keys = ON;`) y modo WAL (`PRAGMA journal_mode = WAL;`) con archivo local `database.sqlite`
- [x] T006 Implementar el script de auto-seed en `backend/src/db/seed.js` que autoinicializa las 6 tablas relacionales (`store_settings`, `users`, `products`, `orders`, `order_items`, `payments`) y siembra los datos del propietario ('Jeancarlos José Huertas Quichca', Yape 924046690, Plin 983064501, BCP 22079349234041, CCI 00222017934923404128), usuario Admin (`admin@fitstore.pe` / `admin123`), 2 clientes demo (Carlos Mendoza y Valeria Gómez), 8 productos fitness con fotos de Unsplash y compras demo
- [x] T007 Implementar el servidor Express en `backend/src/server.js` con middleware CORS sin restricciones de origen, parser JSON, hook de auto-seed al iniciar y manejo global de errores
- [x] T008 [P] Implementar endpoint REST `GET /api/settings` en `backend/src/routes/settings.js` para consultar la configuración y cuentas recaudadoras del propietario
- [x] T009 [P] Configurar cliente HTTP API base en `frontend/src/services/api.js` para consumir los endpoints REST del backend

**Checkpoint**: Base de datos SQLite autoinicializada con las 6 tablas y backend REST operativo.

---

## Phase 3: User Story 1 - Exploración y Búsqueda Interactiva en el Catálogo (Priority: P1) 🎯 MVP

**Goal**: Permitir al cliente navegar el catálogo de suplementos y equipamiento, realizar búsquedas en tiempo real, filtrar por categoría y ordenar por precio en Soles (`S/`).

**Independent Test**: Iniciar el sistema, ingresar a la tienda, buscar "Creatina", filtrar por "Proteínas" y ordenar por precio para validar actualización visual inmediata.

- [x] T010 [P] [US1] Implementar endpoints REST de catálogo `GET /api/products` (con soporte para query params `category`, `search` y `sort`) y `GET /api/products/:id` en `backend/src/routes/products.js`
- [x] T011 [P] [US1] Crear componente `frontend/src/components/ProductCard.jsx` con imagen en alta resolución, badge de categoría, nombre, descripción corta, stock disponible, precio en Soles (`S/`), selector de cantidad `-` / `+`, botón de vista rápida y botón "Agregar al Carrito"
- [x] T012 [P] [US1] Crear componente `frontend/src/components/Header.jsx` con logotipo 'FitStore Pro', barra de búsqueda en tiempo real, píldoras de filtrado por categoría ('Todos', 'Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'), selector de ordenamiento por precio y accesos de navegación
- [x] T013 [US1] Integrar la vista principal de la tienda en `frontend/src/App.jsx` conectando el catálogo con la API REST, filtrado en tiempo real y renderizado responsivo de la grilla

**Checkpoint**: Catálogo interactivo completamente navegable y funcional de manera autónoma (MVP alcanzado).

---

## Phase 4: User Story 2 - Detalle Rápido de Producto y Gestión del Carrito Deslizable (Priority: P2)

**Goal**: Permitir abrir el modal de vista rápida con especificaciones y gestionar el carrito deslizable con persistencia en `localStorage`, cálculo de envío y botón de checkout.

**Independent Test**: Añadir productos al carrito, verificar badge numérico, abrir drawer, modificar cantidades, verificar envío gratis (Subtotal ≥ S/ 150.00) o tarifa plana (S/ 10.00), y recargar la página comprobando persistencia.

- [x] T014 [P] [US2] Implementar `frontend/src/context/CartContext.jsx` con estado global reactivo sincronizado en `localStorage`, métodos para agregar, decrementar, eliminar ítems y cálculo automático de Subtotal, Envío (S/ 10.00 o S/ 0.00 si Subtotal ≥ S/ 150.00) y Total
- [x] T015 [P] [US2] Crear componente `frontend/src/components/ProductModal.jsx` para visualización ampliada de especificaciones, stock máximo disponible y control interactivo de unidades
- [x] T016 [US2] Crear componente `frontend/src/components/CartDrawer.jsx` con animación deslizante, listado de ítems seleccionados, miniaturas, controles `-` / `+`, botón de papelera, desglose financiero en Soles y botón 'Ir a Pagar (Checkout)'
- [x] T017 [US2] Conectar el Drawer de Carrito y el Modal de Producto en `frontend/src/App.jsx` vinculando el badge numérico de `frontend/src/components/Header.jsx`

**Checkpoint**: Carrito deslizable y modal de producto completamente funcionales con persistencia local.

---

## Phase 5: User Story 3 - Perfil del Cliente y Consulta de Historial de Pedidos (Priority: P3)

**Goal**: Brindar al cliente la gestión de sus datos personales de entrega (DNI 8 dígitos, Celular 9 dígitos), alternar entre clientes demo o registrar uno nuevo, y consultar su historial de pedidos con desglose y cuenta de cobro del propietario.

**Independent Test**: Abrir la vista "Mi Perfil y Mis Pedidos", cambiar entre los clientes demo, modificar teléfono y dirección guardando cambios en SQLite, y verificar el historial de órdenes con la cuenta receptora de abono.

- [x] T018 [P] [US3] Implementar endpoints de usuarios en `backend/src/routes/users.js` (`GET /api/users`, `PUT /api/users/:id`, `POST /api/users`) con validación de DNI de 8 dígitos (`^\d{8}$`) y teléfono móvil de 9 dígitos (`^\d{9}$`)
- [x] T019 [P] [US3] Implementar endpoint de historial de compras `GET /api/orders/user/:userId` en `backend/src/routes/orders.js` retornando el pedido con sus ítems y datos de pago con la cuenta receptora del propietario
- [x] T020 [P] [US3] Crear contexto de usuario en `frontend/src/context/UserContext.jsx` para gestionar el cliente activo, la lista de perfiles demo y las mutaciones de actualización y registro
- [x] T021 [US3] Implementar componente `frontend/src/components/ProfileView.jsx` con pestañas para datos personales (formulario reactivo de edición), selector de cliente demo (Carlos Mendoza / Valeria Gómez), modal/formulario de registro de nuevo cliente, y tabla de historial "Mis Pedidos" con detalles de ítems y cuenta de pago
- [x] T022 [US3] Integrar la conmutación entre vista de Tienda y vista de Perfil en `frontend/src/App.jsx` activable desde el botón 'Mi Perfil y Mis Pedidos' de `frontend/src/components/Header.jsx`

**Checkpoint**: Perfil de cliente, alternancia demo e historial de pedidos 100% operativos e integrados con SQLite.

---

## Phase 6: User Story 4 - Auto-Inicialización y Configuración Central (Priority: P4)

**Goal**: Garantizar la robustez del auto-seed en frío, la verificación de integridad referencial y el acceso de verificación rápida para demostraciones.

**Independent Test**: Borrar `database.sqlite`, iniciar el servidor backend y verificar que todas las tablas y datos se regeneren en menos de 2 segundos.

- [x] T023 [US4] Implementar verificación de integridad y prevención de re-seed accidental en `backend/src/server.js` asegurando que el servidor verifique la consistencia del esquema antes de escuchar conexiones
- [x] T024 [US4] Agregar en `frontend/src/components/Header.jsx` y `frontend/src/App.jsx` el botón de acceso rápido 'Panel Admin' que muestre un modal/banner informativo de estado y credenciales preconfiguradas (`admin@fitstore.pe` / `admin123`) para la conmutación ágil sin bloqueos

**Checkpoint**: Plataforma verificable sin bloqueos y con auto-seed blindado ante reinicios.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes finales de estilo visual, control de errores y validación global.

- [x] T025 [P] Configurar estilos globales y tipografía en `frontend/src/index.css` asegurando consistencia de colores para estados de stock, insignias de categoría y botones de acción
- [x] T026 Implementar captura de errores amigable en llamadas de red y estados vacíos en `frontend/src/App.jsx`
- [x] T027 Ejecutar validación completa de los 4 escenarios de prueba descritos en `specs/001-tienda-catalogo-y-perfil/quickstart.md` comprobando catálogo, carrito, perfil y base de datos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias, arranca de inmediato.
- **Foundational (Phase 2)**: Depende de Phase 1. Bloquea todas las historias de usuario.
- **User Story 1 (Phase 3)**: Depende de Phase 2 (Foundational). Representa el MVP.
- **User Story 2 (Phase 4)**: Depende de Phase 2. Se integra con la vista de US1.
- **User Story 3 (Phase 5)**: Depende de Phase 2. Puede desarrollarse en paralelo con US2.
- **User Story 4 (Phase 6)**: Depende de Phase 2. Refuerza la resiliencia del auto-seed.
- **Polish (Phase 7)**: Depende de la finalización de las historias de usuario deseadas.

### User Story Dependencies

- **US1 (Catálogo)**: No depende de otras historias.
- **US2 (Carrito & Modal)**: Consume productos del catálogo para añadir al carrito, pero su contexto y lógica son independientes.
- **US3 (Perfil & Pedidos)**: Opera sobre la entidad usuario y lee órdenes previas de SQLite independientemente del catálogo.
- **US4 (Auto-seed & Switcher)**: Valida la infraestructura creada en la fase fundacional.

---

## Implementation Strategy

### MVP First (User Story 1)
1. Completar Setup (T001 - T004)
2. Completar Foundational (T005 - T009)
3. Completar User Story 1 (T010 - T013)
4. **Validar MVP**: Catálogo navegable con búsqueda y filtros funcionando al 100%

### Entrega Incremental
1. MVP listo (Catálogo)
2. Incorporar User Story 2 (Modal de producto + Carrito deslizable persistente)
3. Incorporar User Story 3 (Perfil de cliente + Alternancia demo + Historial)
4. Incorporar User Story 4 (Robustez de auto-seed + Acceso rápido Admin)
5. Pulido y validación final con Quickstart
