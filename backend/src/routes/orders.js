import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/orders/user/:userId - Historial de pedidos de un cliente con sus items y pagos
router.get('/user/:userId', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.params.userId);

    const fullOrders = orders.map((order) => {
      const items = db.prepare(`
        SELECT * FROM order_items
        WHERE order_id = ?
      `).all(order.id);

      const payment = db.prepare(`
        SELECT * FROM payments
        WHERE order_id = ?
        ORDER BY id DESC LIMIT 1
      `).get(order.id);

      return {
        ...order,
        items,
        payment: payment || null
      };
    });

    res.json(fullOrders);
  } catch (error) {
    console.error('Error al obtener pedidos del cliente:', error);
    res.status(500).json({ error: 'Error al obtener historial de pedidos' });
  }
});

// GET /api/orders - Listar todas las órdenes (para el panel admin)
router.get('/', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    const fullOrders = orders.map((order) => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(order.id);
      return {
        ...order,
        items,
        payment: payment || null
      };
    });
    res.json(fullOrders);
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// POST /api/orders - Crear nueva orden
router.post('/', (req, res) => {
  try {
    const {
      user_id,
      customer_name,
      customer_dni,
      customer_phone,
      shipping_address,
      total,
      items,
      payment
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe contener al menos un producto' });
    }

    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count + 1;
    const order_code = `ORD-2026-${String(orderCount).padStart(3, '0')}`;

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_code, user_id, customer_name, customer_dni, customer_phone, shipping_address, total, order_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderResult = insertOrder.run(
      order_code,
      user_id,
      customer_name,
      customer_dni,
      customer_phone,
      shipping_address,
      total,
      payment?.payment_status === 'Aprobado' ? 'Pagado / En Preparación' : 'Pendiente de Pago'
    );

    const orderId = orderResult.lastInsertRowid;

    // Insertar ítems
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(
        orderId,
        item.product_id,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.quantity * item.unit_price
      );

      // Descontar stock
      db.prepare(`
        UPDATE products
        SET stock = MAX(0, stock - ?)
        WHERE id = ?
      `).run(item.quantity, item.product_id);
    }

    // Insertar pago si fue suministrado
    if (payment) {
      const insertPayment = db.prepare(`
        INSERT INTO payments (
          order_id, method, destination_account, amount, currency, operation_number, voucher_image, card_last4, auth_code, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertPayment.run(
        orderId,
        payment.method || 'Yape',
        payment.destination_account || 'Cuenta del Propietario',
        total,
        'PEN',
        payment.operation_number || null,
        payment.voucher_image || null,
        payment.card_last4 || null,
        payment.auth_code || null,
        payment.payment_status || 'Pendiente de Verificación'
      );
    }

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      order_id: orderId,
      order_code
    });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  }
});

export default router;

