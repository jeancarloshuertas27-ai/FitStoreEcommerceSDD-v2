# API Contracts: Módulo 007 - Mercado Pago (Tarjeta + Yape/Plin) y Tarifas de Envío por Provincia

**Feature Branch**: `007-mercadopago-yape-plin-envios` | **Spec**: [spec.md](../spec.md)

---

## 1. Pagos con Mercado Pago Checkout Pro

### 1.1 Crear Preferencia de Pago
Crea una preferencia oficial en Mercado Pago Sandbox con moneda `PEN` y flete provincial incluido.

- **Endpoint**: `POST /api/payments/create-preference`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "items": [
    {
      "id": 1,
      "title": "Proteína Whey Isolate 2kg",
      "quantity": 1,
      "unit_price": 189.90
    }
  ],
  "shipping": {
    "department": "Lima",
    "province": "Lima Metropolitana",
    "cost": 12.00
  },
  "payer": {
    "name": "Carlos Mendoza",
    "email": "carlos.mendoza@gmail.com",
    "phone": "987654321",
    "dni": "72849102",
    "address": "Av. Javier Prado Este 2450, San Borja"
  }
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "preferenceId": "3865795884-a1b2c3d4-e5f6-7890-abcd-1234567890ab",
  "initPoint": "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=...",
  "sandboxInitPoint": "https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=...",
  "publicKey": "<TU_MP_PUBLIC_KEY>"
}
```

- **Response `400 Bad Request`**:
```json
{
  "success": false,
  "error": "El carrito está vacío o faltan datos del comprador y destino de envío."
}
```

---

### 1.2 Verificación de Retorno Mercado Pago (Canal Frontend)
> **Implementación final**: la orden se crea en estado pendiente en `create-preference` (sin descontar stock) y se enlaza por `external_reference` = `order_code`. Este endpoint solo necesita `{ "payment_id": "..." }`; el backend consulta `GET /v1/payments/{id}`, valida monto/moneda y aprueba de forma idempotente.
Verifica el resultado de la transacción una vez que el cliente vuelve a la tienda por `back_urls.success`.

- **Endpoint**: `POST /api/payments/verify-mercadopago`
- **Request Body**:
```json
{
  "payment_id": "1314151617",
  "preference_id": "3865795884-a1b2c3d4-...",
  "status": "approved",
  "external_reference": "ORDER-1732194000-482",
  "cart_items": [
    { "id": 1, "quantity": 1, "price": 189.90 }
  ],
  "shipping": {
    "department": "Lima",
    "province": "Lima Metropolitana",
    "cost": 12.00,
    "address": "Av. Javier Prado Este 2450"
  },
  "user_id": 2
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "Aprobado",
  "orderId": 45,
  "orderCode": "FIT-2026-0045",
  "total": 201.90,
  "shippingCost": 12.00,
  "payment": {
    "payment_method": "mercadopago",
    "operation_number": "1314151617",
    "amount": 201.90,
    "status": "Aprobado"
  }
}
```

---

### 1.3 Webhook Asíncrono de Mercado Pago (IPN)
Recibe notificaciones automáticas de eventos emitidos por Mercado Pago.

- **Endpoint**: `POST /api/payments/mercadopago-webhook`
- **Query Params o Body**: `?topic=payment&id=1314151617` o `{ "type": "payment", "data": { "id": "1314151617" } }`
- **Response `200 OK`**:
```json
{
  "received": true
}
```

---

## 2. Pago Directo con Yape / Plin (Antifraude)

### 2.1 Procesar Pago Yape / Plin
- **Endpoint**: `POST /api/payments/yape-plin`
- **Request Body**:
```json
{
  "payment_method": "yape",
  "phone": "987654321",
  "otp": "748288",
  "items": [
    { "id": 1, "title": "Proteína Whey", "quantity": 1, "price": 189.90 }
  ],
  "shipping": {
    "department": "Ayacucho",
    "province": "Huamanga",
    "cost": 8.00,
    "address": "Jr. 28 de Julio 145"
  },
  "user_id": 2
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "Aprobado",
  "orderId": 46,
  "orderCode": "FIT-2026-0046",
  "total": 197.90,
  "shippingCost": 8.00,
  "payment": {
    "payment_method": "yape",
    "operation_number": "YAPE-748288",
    "payer_phone": "987654321",
    "amount": 197.90,
    "status": "Aprobado"
  }
}
```

- **Response `400 Bad Request` (Código Trivial o Inválido)**:
```json
{
  "success": false,
  "error": "Código de aprobación inválido o trivial (ej. 123456, 000000). Ingrese un código OTP legítimo."
}
```

- **Response `409 Conflict` (Código Ya Utilizado)**:
```json
{
  "success": false,
  "error": "Este número de operación ya fue utilizado en otra transacción."
}
```

---

## 3. Tarifas de Envío por Provincia (`shipping_rates`)

### 3.1 Listar Tarifas Activas (Público - Checkout)
- **Endpoint**: `GET /api/shipping-rates`
- **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "department": "Ayacucho",
    "province": "Huamanga (Entrega Local)",
    "cost": 8.00,
    "delivery_days": "1 a 2 días hábiles",
    "active": 1
  },
  {
    "id": 2,
    "department": "Lima",
    "province": "Lima Metropolitana",
    "cost": 12.00,
    "delivery_days": "2 a 3 días hábiles",
    "active": 1
  },
  {
    "id": 3,
    "department": "Nacional",
    "province": "Otras Provincias (Perú)",
    "cost": 18.00,
    "delivery_days": "3 a 5 días hábiles",
    "active": 1
  }
]
```

---

### 3.2 Listar Todas las Tarifas (Panel Admin)
- **Endpoint**: `GET /api/admin/shipping-rates`
- **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "department": "Ayacucho",
    "province": "Huamanga (Entrega Local)",
    "cost": 8.00,
    "delivery_days": "1 a 2 días hábiles",
    "active": 1,
    "created_at": "2026-11-21 12:00:00"
  }
]
```

---

### 3.3 Crear Tarifa de Envío (Panel Admin)
- **Endpoint**: `POST /api/admin/shipping-rates`
- **Request Body**:
```json
{
  "department": "Cusco",
  "province": "Cusco Ciudad",
  "cost": 16.00,
  "delivery_days": "2 a 4 días hábiles",
  "active": 1
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "id": 6,
  "message": "Tarifa de envío registrada exitosamente"
}
```

---

### 3.4 Actualizar Tarifa de Envío (Panel Admin)
- **Endpoint**: `PUT /api/admin/shipping-rates/:id`
- **Request Body**:
```json
{
  "department": "Lima",
  "province": "Lima Metropolitana",
  "cost": 14.00,
  "delivery_days": "2 días hábiles",
  "active": 1
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Tarifa de envío actualizada exitosamente"
}
```

---

### 3.5 Eliminar o Desactivar Tarifa (Panel Admin)
- **Endpoint**: `DELETE /api/admin/shipping-rates/:id`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Tarifa de envío eliminada"
}
```
