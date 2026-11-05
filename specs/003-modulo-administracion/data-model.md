# Data Model & Entidades: Módulo 003 - Panel de Administración

## 1. Diagrama de Relaciones y Entidades Administradas

```mermaid
erDiagram
    STORE_SETTINGS {
        int id PK
        string owner_name
        string yape_number
        string plin_number
        string bank_name
        string bank_account_soles
        string bank_cci
        string whatsapp_notification
        datetime updated_at
    }

    USERS {
        int id PK
        string name
        string dni
        string email
        string phone
        string address
        string city
        string password
        string role
        datetime created_at
    }

    PRODUCTS {
        int id PK
        string name
        string description
        string category
        real price
        int stock
        string image_url
        int featured
        datetime created_at
    }

    ORDERS {
        int id PK
        string order_code
        int user_id FK
        string customer_name
        string customer_dni
        string customer_phone
        string shipping_address
        real total
        string order_status
        datetime created_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        string product_name
        int quantity
        real unit_price
        real subtotal
    }

    PAYMENTS {
        int id PK
        int order_id FK
        string method
        string destination_account
        real amount
        string currency
        string operation_number
        text voucher_image
        string card_last4
        string auth_code
        string payment_status
        datetime created_at
    }

    USERS ||--o{ ORDERS : "realiza"
    ORDERS ||--|{ ORDER_ITEMS : "contiene"
    ORDERS ||--o| PAYMENTS : "respalda"
    PRODUCTS ||--o{ ORDER_ITEMS : "referenciado_en"
```

---

## 2. Ciclo de Vida y Transiciones de Estados de Pagos y Pedidos

```mermaid
stateDiagram-v2
    [*] --> Pendiente_Verificacion: Cliente paga vía Yape/Plin/Transferencia y sube voucher
    [*] --> Pagado_Preparacion: Cliente paga vía Tarjeta Sandbox (AUTH-XXXX automático)

    state "En Verificación (order_status)\nPendiente de Verificación (payment_status)" as Pendiente_Verificacion
    state "Pagado / En Preparación (order_status)\nAprobado (payment_status)" as Pagado_Preparacion
    state "Enviado (order_status)\nAprobado (payment_status)" as Enviado
    state "Entregado (order_status)\nAprobado (payment_status)" as Entregado
    state "Cancelado (order_status)\nRechazado (payment_status)\n[Stock Revertido]" as Cancelado

    Pendiente_Verificacion --> Pagado_Preparacion: Admin pulsa "Aprobar Abono en Mi Cuenta"
    Pendiente_Verificacion --> Cancelado: Admin pulsa "Rechazar Comprobante" (Reversión atómica de stock)

    Pagado_Preparacion --> Enviado: Admin selecciona "Enviado" (Despacho a courier)
    Enviado --> Entregado: Admin selecciona "Entregado" (Entrega completada)
```

---

## 3. Comportamiento Atómico del Inventario (`products.stock`)

1. **Al crear un pedido en Checkout (Módulo 002)**:
   ```sql
   UPDATE products
   SET stock = MAX(0, stock - ?)
   WHERE id = ?;
   ```
2. **Al aprobar el comprobante (Módulo 003)**:
   - El inventario se mantiene igual (ya fue reservado).
   - Se actualiza `payments.payment_status = 'Aprobado'` y `orders.order_status = 'Pagado / En Preparación'`.
3. **Al rechazar el comprobante (Módulo 003)**:
   - Para cada ítem del pedido en `order_items`:
     ```sql
     UPDATE products
     SET stock = stock + ?
     WHERE id = ?;
     ```
   - Se actualiza `payments.payment_status = 'Rechazado'` y `orders.order_status = 'Cancelado'`.
4. **Al crear o editar productos desde el panel (Módulo 003)**:
   - El administrador puede aumentar o disminuir el valor de `stock` directamente desde el modal de edición, impactando en tiempo real en la tienda del cliente.

---

## 4. Estructura de Consulta de Clientes Enriquecida

Para la **Pestaña 3 (Gestión de Clientes)**, la API REST devuelve los usuarios con rol `'client'` agrupando sus estadísticas comerciales:

| Campo | Tipo | Origen | Descripción |
|---|---|---|---|
| `id` | INTEGER | `users.id` | Identificador único del cliente. |
| `name` | TEXT | `users.name` | Nombre y apellido del cliente. |
| `dni` | TEXT | `users.dni` | DNI de 8 dígitos numéricos. |
| `email` | TEXT | `users.email` | Correo electrónico de contacto. |
| `phone` | TEXT | `users.phone` | Celular peruano de 9 dígitos numéricos. |
| `address` | TEXT | `users.address` | Dirección de envío habitual. |
| `city` | TEXT | `users.city` | Ciudad / Destino de entrega. |
| `orders_count` | INTEGER | Agregación `COUNT(orders.id)` | Cantidad histórica de pedidos realizados. |
| `total_spent` | REAL | Agregación `SUM(orders.total)` | Monto acumulado en Soles (`S/`) de pedidos no cancelados. |
