# API Contracts: Módulo 005 - Chatbot Asesor Deportivo Inteligente (FitBot)

**Feature**: `005-chatbot-asesor-fitbot` | **Date**: 2026-11-06  
Prefijo base: `/api` | Formato: `application/json`

---

## 1. Consulta de Catálogo para Asesoría (`GET /api/products`)

FitBot consulta la lista de productos disponibles en SQLite para recomendar suplementos según el objetivo o término del usuario.

### Request
```http
GET /api/products HTTP/1.1
Host: localhost:3001
```

Opcionalmente admite filtros:
- `?search=creatina`: Búsqueda textual por nombre o descripción.
- `?category=Proteínas`: Filtrado por categoría fitness.

### Response `200 OK`
```json
[
  {
    "id": 1,
    "name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
    "description": "Proteína aislada de suero de leche de máxima pureza para ganancia y recuperación muscular.",
    "category": "Proteínas",
    "price": 189.90,
    "stock": 15,
    "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    "featured": 1
  },
  {
    "id": 2,
    "name": "Creatina Creapure 300g (Dymatize)",
    "description": "Creatina monohidratada micronizada con sello Creapure para incremento de fuerza y volumen celular.",
    "category": "Creatinas",
    "price": 119.90,
    "stock": 20,
    "image_url": "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=800",
    "featured": 1
  }
]
```

---

## 2. Rastreo de Pedidos desde el Chat (`GET /api/orders`)

FitBot consulta las órdenes registradas en SQLite para brindar el estado de compras asociadas a un DNI peruano (8 dígitos) o código de orden.

### Request
```http
GET /api/orders HTTP/1.1
Host: localhost:3001
```

### Response `200 OK`
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
      "payment_status": "Pendiente de Verificación"
    }
  }
]
```

*Regla de FitBot*: Si el cliente ingresa `72458912`, FitBot filtra las órdenes donde `customer_dni === "72458912"`, selecciona hasta las 3 más recientes y resume:
- Código de Orden: `ORD-2026-003`
- Fecha: `05/11/2026`
- Total: `S/ 304.90`
- Estado: `En Verificación` (Abono pendiente de revisión del dueño).

---

## 3. Consulta de Cuentas Receptoras (`GET /api/settings`)

FitBot consulta en tiempo real los números y cuentas vigentes del propietario para orientar al cliente en el chat.

### Request
```http
GET /api/settings HTTP/1.1
Host: localhost:3001
```

### Response `200 OK`
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

