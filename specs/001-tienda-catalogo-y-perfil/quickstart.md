# Quickstart & Guía de Verificación: Módulo 001

Esta guía describe los pasos para inicializar y verificar de extremo a extremo las capacidades implementadas en el **Módulo 001 (Catálogo, Carrito, Perfil y Auto-Seed SQLite)** de FitStore Pro.

---

## 1. Requisitos Previos

- **Node.js**: Versión 18.0.0 o superior instalada.
- **npm**: Gestor de paquetes incluido con Node.js.
- **Navegador Web Moderno**: Chrome, Edge, Firefox o Safari con soporte para LocalStorage y ES Modules.

---

## 2. Instalación y Puesta en Marcha

Desde la raíz del proyecto (`fitstore-ecommerce`):

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Levantar el servidor backend y el frontend simultáneamente
npm run dev
```

El sistema iniciará automáticamente:
- **Backend API**: `http://localhost:3001` (o puerto configurado) con middleware CORS habilitado.
- **Frontend Vite**: `http://localhost:5173` listo con recarga en caliente (HMR).

---

## 3. Escenarios de Verificación Paso a Paso

### Escenario 1: Auto-Seed Relacional SQLite Zero-Setup
1. Verifica que el archivo `database.sqlite` se cree automáticamente en la raíz sin requerir scripts manuales de migración.
2. Abre la URL del backend `http://localhost:3001/api/settings` y confirma que retorne los datos del propietario:
   - Nombre: `Jeancarlos José Huertas Quichca`
   - Yape: `924046690`
   - Plin: `983064501`
   - BCP: `22079349234041`
   - CCI: `00222017934923404128`
3. Consulta `http://localhost:3001/api/products` y valida que existan exactamente los 8 productos fitness con imágenes de Unsplash, categorías oficiales y stock > 15.

### Escenario 2: Exploración, Búsqueda y Filtros en el Catálogo
1. Abre en tu navegador `http://localhost:5173`.
2. Escribe **"Creatina"** en el campo de búsqueda de la barra superior:
   - *Resultado esperado*: La grilla se filtra instantáneamente mostrando únicamente las creatinas Creapure y Micronizada.
3. Haz clic en la píldora de categoría **"Proteínas"**:
   - *Resultado esperado*: Se listan únicamente los productos de proteína (Gold Standard Whey e ISO 100).
4. Selecciona en el combo de ordenamiento **"Precio: menor a mayor"**:
   - *Resultado esperado*: Las tarjetas se reordenan de forma ascendente según su precio en Soles (`S/`).

### Escenario 3: Modal de Producto y Gestión del Carrito Deslizable
1. Pulsa sobre la tarjeta de cualquier producto o en su botón de vista rápida:
   - *Resultado esperado*: Se abre el modal con fotografía ampliada, descripción completa y controles `-` / `+`.
2. Aumenta la cantidad a 2 unidades y haz clic en **"Agregar al Carrito"**:
   - *Resultado esperado*: El badge en el icono del carrito del Header se actualiza a `2` y se presenta una confirmación visual.
3. Haz clic en el botón de Carrito del Header:
   - *Resultado esperado*: Se desliza suavemente el Drawer lateral mostrando el ítem, precio unitario y cantidad.
4. Modifica la cantidad con los botones `-` / `+` o añade otro producto que supere S/ 150.00:
   - *Resultado esperado*: El subtotal y el total se recalculan en tiempo real, cambiando el costo de envío a "Gratis" si el subtotal supera S/ 150.00.
5. Recarga la página del navegador (`F5` o `Ctrl+R`):
   - *Resultado esperado*: Al abrir el drawer nuevamente, los productos y cantidades agregados permanecen intactos gracias a `localStorage`.

### Escenario 4: Perfil del Cliente e Historial de Pedidos
1. En el Header superior, haz clic en **"Mi Perfil y Mis Pedidos"**.
2. Verifica que se carguen los datos del cliente activo por defecto (**Carlos Mendoza Ríos**, DNI `72458912`, Celular `987654321`).
3. Cambia en el selector de perfiles a **"Valeria Gómez Paredes"**:
   - *Resultado esperado*: Los datos del formulario y su lista de compras se actualizan de inmediato.
4. Modifica la dirección de entrega y el número celular de Carlos Mendoza y haz clic en **"Guardar Cambios"**:
   - *Resultado esperado*: El sistema confirma el guardado y los cambios se persisten en la tabla `users` de SQLite.
5. En la sección "Mis Pedidos", revisa el historial:
   - *Resultado esperado*: Se muestran las órdenes registradas con su código (`ORD-2026-001`), lista de ítems, monto total en Soles, cuenta destino de abono del titular y estados del pedido.

