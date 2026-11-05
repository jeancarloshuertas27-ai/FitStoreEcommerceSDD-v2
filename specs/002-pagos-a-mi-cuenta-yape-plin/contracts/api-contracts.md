# API Contracts: Módulo 002 - Pasarela de Checkout y Pagos al Propietario

Prefijo base: `/api`  
Formato: `application/json`

---

## 1. `POST /api/orders` (Creación de Pedido con Pago Directo al Propietario)

Crea la orden de compra, descuenta stock de los productos adquiridos y registra el pago asociado con la cuenta receptora del propietario, número de operación y voucher.

### Request Body
```json
{
  "user_id": 2,
  "customer_name": "Carlos Mendoza Ríos",
  "customer_dni": "72458912",
  "customer_phone": "987654321",
  "shipping_address": "Av. Arequipa 2450, Dpto 402, Lima",
  "total": 304.90,
  "items": [
    {
      "product_id": 1,
      "product_name": "Gold Standard 100% Whey 2lb (Optimum Nutrition)",
      "quantity": 1,
      "unit_price": 189.90
    },
    {
      "product_id": 3,
      "product_name": "Creatina Monohidratada Creapure 300g (Universal)",
      "quantity": 1,
      "unit_price": 115.00
    }
  ],
  "payment": {
    "method": "Yape",
    "destination_account": "Yape: 924046690 (Jeancarlos José Huertas Quichca)",
    "amount": 304.90,
    "currency": "PEN",
    "operation_number": "OP-982145",
    "voucher_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "card_last4": null,
    "auth_code": null,
    "payment_status": "Pendiente de Verificación"
  }
}
```

#### Para Pago con Tarjeta Sandbox:
```json
{
  "payment": {
    "method": "Tarjeta Crédito/Débito",
    "destination_account": "Cuenta Recaudadora BCP: 22079349234041 (Jeancarlos José Huertas Quichca)",
    "amount": 304.90,
    "currency": "PEN",
    "operation_number": "TARJ-892410",
    "voucher_image": null,
    "card_last4": "4242",
    "auth_code": "AUTH-8924",
    "payment_status": "Aprobado"
  }
}
```

### Response `201 Created`
```json
{
  "message": "Pedido y pago registrados exitosamente",
  "order_id": 3,
  "order_code": "ORD-2026-003",
  "order": {
    "id": 3,
    "order_code": "ORD-2026-003",
    "customer_name": "Carlos Mendoza Ríos",
    "customer_dni": "72458912",
    "customer_phone": "987654321",
    "shipping_address": "Av. Arequipa 2450, Dpto 402, Lima",
    "total": 304.90,
    "order_status": "Pagado / En Preparación",
    "created_at": "2026-11-04 17:15:00",
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
      "method": "Tarjeta Crédito/Débito",
      "destination_account": "Cuenta Recaudadora BCP: 22079349234041 (Jeancarlos José Huertas Quichca)",
      "amount": 304.90,
      "currency": "PEN",
      "auth_code": "AUTH-8924",
      "card_last4": "4242",
      "payment_status": "Aprobado"
    }
  }
}
```

---

## 2. `GET /api/orders/:id` (Consulta de Boleta de Pedido)

Recupera una orden específica con el detalle completo de ítems, pago y comprobante para renderizar o reabrir la Boleta Electrónica.

### Response `200 OK`
```json
{
  "id": 3,
  "order_code": "ORD-2026-003",
  "customer_name": "Carlos Mendoza Ríos",
  "customer_dni": "72458912",
  "customer_phone": "987654321",
  "shipping_address": "Av. Arequipa 2450, Dpto 402, Lima",
  "total": 304.90,
  "order_status": "Pagado / En Preparación",
  "created_at": "2026-11-04 17:15:00",
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
    "voucher_image": "data:image/png;base64,iVBORw0...",
    "payment_status": "Pendiente de Verificación"
  }
}
```

