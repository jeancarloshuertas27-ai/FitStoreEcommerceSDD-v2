# API Contracts: Módulo 003 - Panel de Administración

Prefijo base: `/api`  
Formato: `application/json`

---

## 1. Gestión de Catálogo y Precios (`/api/products`)

### `POST /api/products` (Crear Producto)
Permite al administrador agregar un nuevo suplemento o accesorio al catálogo.

#### Request Body
```json
{
  "name": "Pre-Entreno C4 Extreme 30 Servicios (Cellucor)",
  "description": "Fórmula avanzada de energía explosiva y concentración con beta-alanina y cafeína anhidra.",
  "category": "Pre-Entrenos",
  "price": 145.00,
  "stock": 25,
  "image_url": "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800",
  "featured": 1
}
```

#### Response `201 Created`
```json
{
  "id": 9,
  "name": "Pre-Entreno C4 Extreme 30 Servicios (Cellucor)",
  "description": "Fórmula avanzada de energía explosiva y concentración con beta-alanina y cafeína anhidra.",
  "category": "Pre-Entrenos",
  "price": 145.00,
  "stock": 25,
  "image_url": "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800",
  "featured": 1,
  "created_at": "2026-11-05 08:45:00"
}
```

---

### `PUT /api/products/:id` (Editar Producto, Precio o Stock)
Permite al administrador modificar cualquier campo, precio o existencias en inventario.

#### Request Body
```json
{
  "name": "Pre-Entreno C4 Extreme 30 Servicios (Cellucor)",
  "description": "Fórmula avanzada de energía explosiva...",
  "category": "Pre-Entrenos",
  "price": 139.90,
  "stock": 30,
  "image_url": "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800",
  "featured": 1
}
```

#### Response `200 OK`
```json
{
  "id": 9,
  "name": "Pre-Entreno C4 Extreme 30 Servicios (Cellucor)",
  "price": 139.90,
  "stock": 30,
  "category": "Pre-Entrenos",
  "featured": 1,
  "message": "Producto actualizado correctamente"
}
```

---

### `DELETE /api/products/:id` (Eliminar Producto)
Elimina el producto del catálogo activo preservando el historial de órdenes pasadas.

#### Response `200 OK`
```json
{
  "message": "Producto eliminado exitosamente del catálogo activo",
  "id": 9
}
```

---

## 2. Gestión y Conciliación de Pedidos (`/api/orders`)

### `GET /api/orders` (Listar Todas las Órdenes)
Retorna todos los pedidos con sus ítems, comprobantes y cuentas destino para la auditoría del administrador.

#### Response `200 OK`
```json
[
  {
    "id": 3,
    "order_code": "ORD-2026-003",
    "customer_name": "Carlos Mendoza Ríos",
    "customer_dni": "72458912",
    "customer_phone": "987654321",
    "shipping_address": "Av. Arequipa 2450, Dpto 402, Miraflores, Lima",
    "total": 304.90,
    "order_status": "En Verificación",
    "created_at": "2026-11-05 08:15:00",
    "items": [
      {
        "id": 5,
        "product_id": 1,
        "product_name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
        "quantity": 1,
        "unit_price": 189.90,
        "subtotal": 189.90
      }
    ],
    "payment": {
      "id": 3,
      "method": "Yape",
      "destination_account": "Yape: 924046690 (Jeancarlos José Huertas Quichca)",
      "amount": 304.90,
      "currency": "PEN",
      "operation_number": "OP-982145",
      "voucher_image": "data:image/png;base64,iVBORw0KGgo...",
      "payment_status": "Pendiente de Verificación"
    }
  }
]
```

---

### `PUT /api/orders/:id/payment` (Aprobar o Rechazar Comprobante de Pago)
Permite al administrador validar si el dinero llegó a su cuenta bancaria o billetera móvil.

#### Request Body para Aprobación
```json
{
  "payment_status": "Aprobado"
}
```
*Efecto*: `payments.payment_status` pasa a `'Aprobado'` y `orders.order_status` a `'Pagado / En Preparación'`.

#### Request Body para Rechazo
```json
{
  "payment_status": "Rechazado"
}
```
*Efecto*: `payments.payment_status` pasa a `'Rechazado'`, `orders.order_status` a `'Cancelado'`, y se restituye de forma atómica el stock de los productos comprados en la tabla `products`.

#### Response `200 OK`
```json
{
  "message": "Estado de pago actualizado correctamente",
  "order_id": 3,
  "order_status": "Pagado / En Preparación",
  "payment_status": "Aprobado",
  "stock_restored": false
}
```

---

### `PUT /api/orders/:id/status` (Actualizar Estado Logístico)
Permite actualizar el avance físico del pedido a `'Enviado'` o `'Entregado'`.

#### Request Body
```json
{
  "order_status": "Enviado"
}
```

#### Response `200 OK`
```json
{
  "message": "Estado del pedido actualizado a Enviado",
  "order_id": 3,
  "order_status": "Enviado"
}
```

---

## 3. Configuración en Caliente de Cuentas del Propietario (`/api/settings`)

### `GET /api/settings`
Obtiene las cuentas bancarias y números de billetera vigentes.

#### Response `200 OK`
```json
{
  "id": 1,
  "store_name": "FitStore Pro",
  "owner_name": "Jeancarlos José Huertas Quichca",
  "yape_number": "924046690",
  "plin_number": "983064501",
  "bank_name": "BCP - Banco de Crédito del Perú",
  "bank_account_soles": "22079349234041",
  "bank_cci": "00222017934923404128",
  "whatsapp_notification": "983064501",
  "updated_at": "2026-11-05 08:30:00"
}
```

---

### `PUT /api/settings` (Actualizar Cuentas del Dueño)
Actualiza en caliente las cuentas receptoras de cobro.

#### Request Body
```json
{
  "owner_name": "Jeancarlos José Huertas Quichca",
  "yape_number": "924046690",
  "plin_number": "983064501",
  "bank_name": "BCP - Banco de Crédito del Perú",
  "bank_account_soles": "22079349234041",
  "bank_cci": "00222017934923404128",
  "whatsapp_notification": "983064501"
}
```

#### Response `200 OK`
```json
{
  "id": 1,
  "owner_name": "Jeancarlos José Huertas Quichca",
  "yape_number": "924046690",
  "plin_number": "983064501",
  "bank_name": "BCP - Banco de Crédito del Perú",
  "bank_account_soles": "22079349234041",
  "bank_cci": "00222017934923404128",
  "whatsapp_notification": "983064501",
  "message": "Configuración de cuentas actualizada correctamente"
}
```

---

## 4. Directorio de Clientes (`/api/users`)

### `GET /api/users` (Con Métricas de Compras)
Retorna la lista de clientes enriquecida con pedidos acumulados y monto total gastado en Soles (`S/`).

#### Response `200 OK`
```json
[
  {
    "id": 2,
    "name": "Carlos Mendoza Ríos",
    "dni": "72458912",
    "email": "carlos.mendoza@gmail.com",
    "phone": "987654321",
    "address": "Av. Arequipa 2450, Dpto 402, Miraflores",
    "city": "Lima",
    "role": "client",
    "orders_count": 2,
    "total_spent": 494.80,
    "created_at": "2026-11-04 12:00:00"
  }
]
```
