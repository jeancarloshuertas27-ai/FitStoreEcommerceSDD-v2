# Data Model & Entidades: Módulo 004 - Motor de Verificación Automática de Pagos

**Feature Branch**: `004-verificacion-automatica-pagos`  
**Date**: 2026-11-06  
**Status**: Completed  
**Spec**: [spec.md](./spec.md)

---

## 1. Esquema Relacional de Base de Datos (SQLite)

El módulo se apoya en las tablas existentes `orders`, `payments`, `order_items`, `products` y `store_settings`, asegurando integridad referencial y atomicidad.

```mermaid
erDiagram
    STORE_SETTINGS ||--o{ PAYMENTS : "recauda en cuentas de"
    ORDERS ||--|| PAYMENTS : "tiene"
    ORDERS ||--|{ ORDER_ITEMS : "contiene"
    PRODUCTS ||--o{ ORDER_ITEMS : "referenciado en"
    USERS ||--o{ ORDERS : "realiza"

    ORDERS {
        integer id PK
        string order_code UK
        integer user_id FK
        string customer_name
        string customer_dni
        string customer_phone
        string shipping_address
        real total
        string order_status "Pagado / En Preparación | Enviado | Entregado | Cancelado"
        datetime created_at
    }

    PAYMENTS {
        integer id PK
        integer order_id FK
        string method "Yape | Plin | Transferencia Bancaria | Tarjeta de Crédito/Débito"
        string destination_account "Cuenta oficial del dueño en store_settings"
        real amount
        string currency "PEN"
        string operation_number "OTP 6 dígitos o N° Operación bancaria"
        string voucher_image "URL o Base64 del comprobante"
        string card_last4 "Últimos 4 dígitos si aplica"
        string auth_code "Hash único: YAPE-AUTO-XXXXXX | CIP-AUTO-XXXXXX | AUTH-XXXXXX"
        string payment_status "Aprobado"
        datetime created_at
    }
```

---

## 2. Entidades y Modelos de Datos en Memoria (DTOs)

### A. Objeto de Solicitud de Verificación Automática (`PaymentVerificationRequest`)
Enviado desde el frontend al endpoint `POST /api/payments/auto-verify`:

```json
{
  "method": "yape_plin",
  "verification_mode": "otp",
  "phone": "987654321",
  "otp_code": "492104",
  "operation_number": null,
  "cip_code": null,
  "card_data": null,
  "items": [
    { "product_id": 1, "product_name": "Gold Standard 100% Whey 2lb", "quantity": 1, "unit_price": 189.90 }
  ],
  "customer": {
    "name": "Carlos Mendoza Ríos",
    "dni": "72458912",
    "phone": "987654321",
    "address": "Av. Arequipa 2450, Dpto 402, Lima",
    "city": "Lima"
  },
  "total": 189.90
}
```

### B. Objeto de Respuesta de Verificación Exitosa (`AutoVerificationResponse`)
Retornado por el backend tras completar la transacción atómica:

```json
{
  "success": true,
  "message": "¡Pago verificado automáticamente! Orden aprobada.",
  "order": {
    "id": 14,
    "order_code": "ORD-2026-014",
    "total": 189.90,
    "order_status": "Pagado / En Preparación",
    "created_at": "2026-11-06T15:55:00.000Z",
    "auto_verified": true
  },
  "payment": {
    "id": 14,
    "method": "Yape",
    "payment_status": "Aprobado",
    "auth_code": "YAPE-AUTO-948215",
    "operation_number": "492104",
    "destination_account": "Yape titular: 924046690 (Jeancarlos José Huertas Quichca)",
    "amount": 189.90,
    "currency": "PEN"
  },
  "audit": {
    "verified_at": "2026-11-06T15:55:02.500Z",
    "verification_latency_ms": 2500,
    "channel": "Camara de Compensacion Digital Yape/Plin",
    "beneficiary": "Jeancarlos José Huertas Quichca"
  }
}
```

---

## 3. Máquina de Estados de la Transacción

```mermaid
stateDiagram-v2
    [*] --> CarritoActivo
    CarritoActivo --> CheckoutPaso2 : Clic en Finalizar Compra
    
    state CheckoutPaso2 {
        [*] --> SeleccionarMetodo
        SeleccionarMetodo --> YapePlinOTP : Pestaña OTP (6 dígitos)
        SeleccionarMetodo --> YapePlinQR : Pestaña QR + N° Operación
        SeleccionarMetodo --> TransferenciaCIP : Transferencia (CIP 24h)
        SeleccionarMetodo --> TarjetaLuhn : Tarjeta (Luhn + CVV)
    }

    CheckoutPaso2 --> VerificandoEnVivo : Clic en "Pagar Ahora"
    
    state VerificandoEnVivo {
        [*] --> Fase1_Conectando : "Conectando con cámara de compensación..."
        Fase1_Conectando --> Fase2_Validando : "Verificando abono en cuenta del titular..."
        Fase2_Validando --> Fase3_Aprobado : "¡Pago verificado automáticamente!"
    }

    VerificandoEnVivo --> ErrorDuplicado : Código u Operación ya registrada (409)
    VerificandoEnVivo --> ErrorFormato : OTP != 6 dígitos o Luhn inválido (400)
    ErrorDuplicado --> CheckoutPaso2 : Permite corregir sin recargar
    ErrorFormato --> CheckoutPaso2 : Permite corregir sin recargar

    VerificandoEnVivo --> PagadoEnPreparacion : Transacción Atómica Exitosa
    
    state PanelAdmin {
        PagadoEnPreparacion --> Enviado : Admin marca como Enviado
        Enviado --> Entregado : Admin marca como Entregado
        PagadoEnPreparacion --> CanceladoRevertido : Admin cancela y devuelve stock
    }
```

---

## 4. Reglas de Negocio y Validación de Entidades
1. **Unicidad de Operación**: La tabla `payments` valida que no exista ningún registro previo con el mismo `operation_number` o `auth_code` en estado `'Aprobado'`.
2. **Formato Numérico**:
   - Celular Yape/Plin: Exactamente 9 dígitos numéricos (`/^\d{9}$/`).
   - Código OTP Yape: Exactamente 6 dígitos numéricos (`/^\d{6}$/`), no repetitivos triviales (`000000`, `111111`).
   - CIP de Transferencia: Prefijo `CIP-` seguido de 4 dígitos de año y 6 dígitos secuenciales (`CIP-2026-XXXXXX`).
3. **Consistencia de Stock**: Toda aprobación de pago ejecuta la deducción de existencias en `products` bajo la misma transacción de base de datos (`db.transaction()`).
