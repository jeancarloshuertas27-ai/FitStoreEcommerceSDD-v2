# API Contracts: Módulo 001 - FitStore Pro

Prefijo global del backend: `/api`  
Formato de transporte: `application/json`

---

## 1. Configuración de Tienda y Cuentas Receptoras

### `GET /api/settings`
Retorna la configuración vigente del negocio y las cuentas bancarias/billeteras del propietario.

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
  "updated_at": "2026-11-04 14:00:00"
}
```

---

## 2. Catálogo de Productos

### `GET /api/products`
Lista los productos del catálogo con soporte para filtros de búsqueda, categoría y ordenamiento.

#### Query Parameters
- `category` (opcional): `'Proteínas'`, `'Creatinas'`, `'Pre-Entrenos'`, `'Accesorios'` o `'Todos'`.
- `search` (opcional): Cadena de texto para buscar en `name` o `description`.
- `sort` (opcional): `'price_asc'`, `'price_desc'`, `'featured'`.

#### Response `200 OK`
```json
[
  {
    "id": 1,
    "name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
    "description": "Proteína aislada de suero de leche de absorción ultra rápida con 24g de proteína pura por servicio.",
    "category": "Proteínas",
    "price": 189.90,
    "stock": 25,
    "image_url": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=800&q=80",
    "featured": 1,
    "created_at": "2026-11-04 14:00:00"
  }
]
```

### `GET /api/products/:id`
Obtiene la ficha técnica ampliada de un producto específico.

#### Response `200 OK`
```json
{
  "id": 1,
  "name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
  "description": "Proteína aislada de suero de leche de absorción ultra rápida con 24g de proteína pura por servicio.",
  "category": "Proteínas",
  "price": 189.90,
  "stock": 25,
  "image_url": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=800&q=80",
  "featured": 1,
  "created_at": "2026-11-04 14:00:00"
}
```

#### Response `404 Not Found`
```json
{
  "error": "Producto no encontrado"
}
```

---

## 3. Usuarios y Clientes

### `GET /api/users`
Obtiene la lista de usuarios registrados para alternar entre perfiles demo o gestión administrativa.

#### Response `200 OK`
```json
[
  {
    "id": 1,
    "name": "Administrador FitStore",
    "email": "admin@fitstore.pe",
    "dni": "00000000",
    "phone": "983064501",
    "address": "Oficina Central FitStore",
    "city": "Lima",
    "role": "admin",
    "created_at": "2026-11-04 14:00:00"
  },
  {
    "id": 2,
    "name": "Carlos Mendoza Ríos",
    "email": "carlos.mendoza@gmail.com",
    "dni": "72458912",
    "phone": "987654321",
    "address": "Av. Arequipa 2450, Dpto 402",
    "city": "Lima",
    "role": "client",
    "created_at": "2026-11-04 14:00:00"
  }
]
```

### `PUT /api/users/:id`
Actualiza la información de perfil personal y despacho de un cliente.

#### Request Body
```json
{
  "name": "Carlos Mendoza Ríos",
  "dni": "72458912",
  "email": "carlos.mendoza@gmail.com",
  "phone": "987654321",
  "address": "Av. Javier Prado Este 1520",
  "city": "Lima"
}
```

#### Response `200 OK`
```json
{
  "id": 2,
  "name": "Carlos Mendoza Ríos",
  "email": "carlos.mendoza@gmail.com",
  "dni": "72458912",
  "phone": "987654321",
  "address": "Av. Javier Prado Este 1520",
  "city": "Lima",
  "role": "client",
  "updated_at": "2026-11-04 14:15:00"
}
```

### `POST /api/users`
Registra un nuevo cliente desde la vista de perfil.

#### Request Body
```json
{
  "name": "Mariana Torres Silva",
  "dni": "78945612",
  "email": "mariana.torres@gmail.com",
  "phone": "998877665",
  "address": "Calle Las Begonias 450",
  "city": "Lima",
  "password": "password123",
  "role": "client"
}
```

#### Response `201 Created`
```json
{
  "id": 4,
  "name": "Mariana Torres Silva",
  "email": "mariana.torres@gmail.com",
  "dni": "78945612",
  "phone": "998877665",
  "address": "Calle Las Begonias 450",
  "city": "Lima",
  "role": "client",
  "created_at": "2026-11-04 14:20:00"
}
```

---

## 4. Pedidos e Historial del Cliente

### `GET /api/orders/user/:userId`
Recupera el historial de compras de un cliente con sus ítems desglosados y pagos vinculados.

#### Response `200 OK`
```json
[
  {
    "id": 1,
    "order_code": "ORD-2026-001",
    "user_id": 2,
    "customer_name": "Carlos Mendoza Ríos",
    "customer_dni": "72458912",
    "customer_phone": "987654321",
    "shipping_address": "Av. Arequipa 2450, Dpto 402, Lima",
    "total": 304.90,
    "order_status": "Pagado / En Preparación",
    "created_at": "2026-11-04 10:30:00",
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
        "quantity": 1,
        "unit_price": 189.90,
        "subtotal": 189.90
      },
      {
        "id": 2,
        "product_id": 3,
        "product_name": "Creatina Monohidratada Creapure 300g (Universal)",
        "quantity": 1,
        "unit_price": 115.00,
        "subtotal": 115.00
      }
    ],
    "payment": {
      "id": 1,
      "method": "Yape",
      "destination_account": "Yape titular: 924046690 (Jeancarlos José Huertas Quichca)",
      "amount": 304.90,
      "currency": "PEN",
      "operation_number": "OP-982145",
      "payment_status": "Aprobado"
    }
  }
]
```

