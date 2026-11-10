# API Contracts: Módulo 004 - Motor de Verificación Automática de Pagos

**Feature Branch**: `004-verificacion-automatica-pagos`  
**Date**: 2026-11-06  
**Status**: Completed  
**Spec**: [spec.md](../spec.md)

---

## 1. Endpoint Principal: Verificación y Aprobación Automática de Pago

### `POST /api/payments/auto-verify`
Procesa la verificación en tiempo real de cualquiera de los 3 métodos de pago, previene duplicados en SQLite, genera el hash unívoco de auditoría bancaria, crea el pedido en estado `'Pagado / En Preparación'` y descuenta el stock de forma atómica.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body (Ejemplo Yape OTP)
```json
{
  "method": "yape_plin",
  "action": "verify",
  "verification_mode": "otp",
  "user_id": 2,
  "order_id": null,
  "phone": "987654321",
  "otp_code": "492104",
  "items": [
    {
      "product_id": 1,
      "product_name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
      "quantity": 1,
      "unit_price": 189.90,
      "subtotal": 189.90
    }
  ],
  "customer": {
    "name": "Carlos Mendoza Ríos",
    "dni": "72458912",
    "phone": "987654321",
    "address": "Av. Arequipa 2450, Dpto 402",
    "city": "Lima"
  },
  "total": 189.90
}
```
> *Nota*: Para Transferencia Bancaria (`method: "bank_transfer"`), enviar `action: "reserve_cip"` crea una reserva pendiente con código `CIP-2026-XXXXXX` (vigencia 24h) y descuenta temporalmente el stock; al enviar `action: "verify"` con `cip_code` y `operation_number` (incluyendo `order_id` si venía de reserva) se verifica y aprueba emitiendo `auth_code: "CIP-AUTO-XXXXXX"`. Si han pasado más de 24 horas desde la reserva, el servidor marca la orden como `'Expirado'`, libera el stock y responde HTTP `410`.

#### Response 201 Created (Éxito)
```json
{
  "success": true,
  "message": "¡Pago verificado automáticamente! Orden aprobada.",
  "order": {
    "id": 15,
    "order_code": "ORD-2026-015",
    "total": 189.90,
    "order_status": "Pagado / En Preparación",
    "created_at": "2026-11-06T15:56:00.000Z",
    "customer_name": "Carlos Mendoza Ríos",
    "customer_dni": "72458912",
    "auto_verified": true
  },
  "payment": {
    "id": 15,
    "method": "Yape",
    "payment_status": "Aprobado",
    "auth_code": "YAPE-AUTO-839102",
    "operation_number": "492104",
    "destination_account": "Yape titular: 924046690 (Jeancarlos José Huertas Quichca)",
    "amount": 189.90,
    "currency": "PEN"
  },
  "audit": {
    "channel": "Cámara de Compensación Yape / Plin",
    "beneficiary": "Jeancarlos José Huertas Quichca",
    "verified_at": "2026-11-06T15:56:02.500Z"
  }
}
```

#### Response 409 Conflict (Operación Duplicada / Antifraude)
```json
{
  "success": false,
  "error": "DUPLICATE_OPERATION",
  "message": "Esta operación o código de aprobación ya fue procesado y acreditado previamente. Por favor ingresa el código de tu abono actual."
}
```

#### Response 409 Conflict (Stock Insuficiente)
```json
{
  "success": false,
  "error": "INSUFFICIENT_STOCK",
  "message": "Stock insuficiente para completar la compra del producto seleccionado. No se realizó ningún cobro."
}
```

#### Response 410 Gone (Código CIP Expirado > 24 horas)
```json
{
  "success": false,
  "error": "CIP_EXPIRED",
  "message": "El plazo de 24 horas de tu código CIP ha expirado. La reserva fue cancelada y el stock liberado."
}
```

#### Response 400 Bad Request (Formato Inválido)
```json
{
  "success": false,
  "error": "INVALID_FORMAT",
  "message": "El código de aprobación de Yape debe contener exactamente 6 dígitos numéricos válidos (no secuencias repetidas como 000000)."
}
```

---

## 2. Endpoint de Auditoría Bancaria

### `GET /api/payments/audit/:orderCode`
Obtiene los detalles de conciliación automática y trazabilidad de abono directo para una orden específica, accesible desde el Panel de Administración o la boleta del cliente.

#### Response 200 OK
```json
{
  "order_code": "ORD-2026-015",
  "payment_method": "Yape",
  "payment_status": "Aprobado",
  "auth_code": "YAPE-AUTO-839102",
  "operation_number": "492104",
  "destination_account": "Yape titular: 924046690 (Jeancarlos José Huertas Quichca)",
  "total": 189.90,
  "verified_at": "2026-11-06T15:56:02.500Z",
  "auto_verified": true,
  "items": [
    {
      "product_name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
      "quantity": 1,
      "unit_price": 189.90
    }
  ]
}
```

---

## 3. Endpoint de Cancelación y Reversión de Stock

### `POST /api/orders/:id/cancel`
Permite al Administrador anular un pedido verificado en caso de reclamo o devolución, revirtiendo atómicamente el stock en la tabla `products` de SQLite.

#### Response 200 OK
```json
{
  "success": true,
  "message": "Orden cancelada exitosamente y stock de productos reintegrado al inventario.",
  "order_code": "ORD-2026-015",
  "order_status": "Cancelado"
}
```
