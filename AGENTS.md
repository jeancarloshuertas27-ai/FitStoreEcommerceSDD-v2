# FitStore Pro - E-Commerce Full-Stack con Cobros a Cuenta Bancaria Propia, Yape/Plin (con subida de voucher), Pasarela de Tarjeta Sandbox y Panel de Administración

## Stack Técnico
- **Frontend**: React + Vite + Tailwind CSS + Lucide Icons.
- **Backend**: API REST en Node.js + Express (CORS configurado sin bloqueos).
- **Base de Datos**: Relacional en SQLite (`database.sqlite`) con 6 tablas (`users`, `products`, `orders`, `order_items`, `payments`, `store_settings`) y auto-seed inicial automático al arrancar el servidor.

## Arranque en Local
```bash
# Instalación de dependencias
npm install

# Levantar backend y frontend de desarrollo
npm run dev
```

## Convenciones Obligatorias
- **Mercado Peruano**: Toda la interfaz en español de Perú, moneda oficial en Soles (`S/`), DNI de 8 dígitos y teléfono móvil de 9 dígitos.
- **Auto-Seed Zero-Setup**: El servidor debe autoinicializar las 6 tablas y sembrar 8 productos fitness con imágenes reales, 1 admin (`admin@fitstore.pe` / `admin123`), 2 clientes y configuración del propietario si `database.sqlite` no existe.
- **Cobros Directos al Propietario**: Soporte para Vía 1 (Yape/Plin con QR, voucher/demo y N° op), Vía 2 (Transferencia a cuenta/CCI con botón copiar y N° op) y Vía 3 (Tarjeta Sandbox con código `AUTH-XXXX` y liquidación explícita a la cuenta del dueño).
- **Verificabilidad**: Barra superior persistente para alternar entre Tienda, Perfil/Pedidos y Panel de Administración, con botón de acceso rápido Admin en 1 clic.
- **Cierre de Feature**: Cuando te pida "cierra la feature", ejecuta: verificar el working tree y commitear los cambios pendientes; correr build de verificación (parar si falla); hacer checkout de main; fusionar la rama de la feature con --no-ff y el mensaje "Merge feature NNN: <nombre>"; borrar la rama local y remota correspondiente; subir main al remoto; y mostrar git log --oneline --graph -10.
- **Cloudflare CLI**: When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.

Las reglas de producto viven en .specify/memory/constitution.md y el estado del producto en specs/README.md

