# Research & Technical Decisions: Módulo 001

## 1. Stack Tecnológico y Arquitectura de Ejecución

### Frontend: React + Vite + Tailwind CSS + Lucide Icons
- **Decisión**: Implementar la interfaz de usuario con React (SPA moderna), empaquetada con Vite para recarga ultra rápida (HMR), estilizada con Tailwind CSS y utilitarios de diseño responsivo, e iconografía con `lucide-react`.
- **Razón**: Permite construir componentes reactivos e interactivos (drawer deslizante, filtros instantáneos, modales, selectores de cantidad) con mínima sobrecarga y máxima velocidad de carga.
- **Alternativas descartadas**:
  - Next.js: Se descartó para mantener la arquitectura monolítica local simple "Zero-Setup" sin requerir servidor SSR ni dependencias pesadas de framework.
  - UI libraries propietarias pesadas (MUI/AntD): Descartadas en favor de Tailwind CSS nativo para control total del diseño, personalización del mercado peruano y ligereza.

### Backend: Node.js + Express + CORS
- **Decisión**: Servidor REST ligero en Node.js usando Express, con middleware de `cors` configurado con orígenes abiertos para desarrollo y producción local (`origin: '*'`), y parser de JSON nativo (`express.json()`).
- **Razón**: Máxima compatibilidad y velocidad de arranque; no requiere compilación intermedia de backend para levantar el entorno.
- **Alternativas descartadas**:
  - NestJS / Fastify: Descartados por agregar abstracción y boilerplate innecesarios para un backend ágil con SQLite local.

### Persistencia y Motor de Base de Datos: SQLite (`better-sqlite3`)
- **Decisión**: Utilizar `better-sqlite3` como driver de SQLite síncrono y de alto rendimiento en Node.js, almacenando los datos en `database.sqlite` en la raíz del backend.
- **Razón**:
  - Es el driver SQLite más rápido en Node.js (operaciones síncronas sin sobrecarga de promesas en llamadas de base de datos simples).
  - Permite verificar y activar claves foráneas (`PRAGMA foreign_keys = ON;`) y modo WAL (`PRAGMA journal_mode = WAL;`) de inmediato.
  - Permite autoinicialización limpia e imperativa en el evento de inicio del servidor (`seedDatabase()`), garantizando Zero-Setup.
- **Alternativas descartadas**:
  - ORMs pesados (Prisma / TypeORM): Exigen pasos de generación de clientes (`prisma generate`) y migraciones previas (`prisma migrate`) que rompen la regla de "Zero-Setup al arrancar con `npm run dev`".

---

## 2. Estrategia de Auto-Seed y Verificación de Tablas

### Detección y Creación
- Al arrancar el servidor en `server/index.js` o `server/db.js`:
  1. Abre o crea `database.sqlite`.
  2. Ejecuta sentencias `CREATE TABLE IF NOT EXISTS` para las 6 tablas relacionales.
  3. Comprueba si la tabla `store_settings` cuenta con registros. Si está vacía, procede a insertar en una única transacción:
     - Configuración del propietario con datos bancarios y Yape/Plin.
     - 1 Admin (`admin@fitstore.pe`) con contraseña hasheada o de prueba (`admin123`).
     - 2 Clientes peruanos demo con DNI de 8 dígitos y teléfonos de 9 dígitos.
     - 8 Productos fitness con URLs de imágenes de alta fidelidad, categorías oficiales y stock > 15.
     - 2 Órdenes demo con sus correspondientes ítems y pagos asociados.

---

## 3. Estado del Carrito y Experiencia de Usuario

### Carrito en Memoria y LocalStorage
- **Decisión**: Gestionar el estado del carrito en un contexto de React (`CartContext` o hook personalizado `useCart`) con sincronización bidireccional automática con `localStorage`.
- **Razón**: Permite operaciones de agregar, eliminar y modificar cantidad con latencia < 5ms, sin llamadas de red innecesarias, manteniendo persistencia total ante recargas del navegador.
- **Cálculo de Envío**:
  - Subtotal < S/ 150.00: Costo de envío S/ 10.00.
  - Subtotal ≥ S/ 150.00: Costo de envío S/ 0.00 ("¡Envío Gratis!").

