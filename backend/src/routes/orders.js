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

// GET /api/orders/:id - Consulta de una orden específica con items y pago
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(order.id);

    res.json({
      ...order,
      items,
      payment: payment || null
    });
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    res.status(500).json({ error: 'Error al obtener el pedido' });
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

// POST /api/orders - Crear nueva orden con registro de pago y cobro directo al propietario
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

    if (!customer_name || !customer_dni || !customer_phone || !shipping_address) {
      return res.status(400).json({ error: 'Todos los datos del comprador son obligatorios' });
    }

    // Determinar estado de la orden según el estado del pago
    let order_status = 'Pendiente de Pago';
    if (payment) {
      if (payment.payment_status === 'Aprobado') {
        order_status = 'Pagado / En Preparación';
      } else if (payment.payment_status === 'Pendiente de Verificación') {
        order_status = 'En Verificación';
      }
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
      user_id || null,
      customer_name,
      customer_dni,
      customer_phone,
      shipping_address,
      Number(total),
      order_status
    );

    const orderId = orderResult.lastInsertRowid;

    // Insertar ítems y descontar stock de los productos adquiridos
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const savedItems = [];
    for (const item of items) {
      const subtotal = Number(item.quantity) * Number(item.unit_price);
      const itemResult = insertItem.run(
        orderId,
        item.product_id,
        item.product_name,
        item.quantity,
        item.unit_price,
        subtotal
      );

      savedItems.push({
        id: itemResult.lastInsertRowid,
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal
      });

      // Descontar stock
      db.prepare(`
        UPDATE products
        SET stock = MAX(0, stock - ?)
        WHERE id = ?
      `).run(item.quantity, item.product_id);
    }

    // Insertar registro de pago con cuenta receptora y voucher
    let savedPayment = null;
    if (payment) {
      const insertPayment = db.prepare(`
        INSERT INTO payments (
          order_id, method, destination_account, amount, currency, operation_number, voucher_image, card_last4, auth_code, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const paymentResult = insertPayment.run(
        orderId,
        payment.method || 'Yape',
        payment.destination_account || 'Cuenta del Propietario',
        Number(payment.amount || total),
        payment.currency || 'PEN',
        payment.operation_number || null,
        payment.voucher_image || null,
        payment.card_last4 || null,
        payment.auth_code || null,
        payment.payment_status || 'Pendiente de Verificación'
      );

      savedPayment = {
        id: paymentResult.lastInsertRowid,
        order_id: orderId,
        method: payment.method || 'Yape',
        destination_account: payment.destination_account,
        amount: Number(payment.amount || total),
        currency: payment.currency || 'PEN',
        operation_number: payment.operation_number || null,
        voucher_image: payment.voucher_image || null,
        card_last4: payment.card_last4 || null,
        auth_code: payment.auth_code || null,
        payment_status: payment.payment_status || 'Pendiente de Verificación'
      };
    }

    const createdOrder = {
      id: orderId,
      order_code,
      user_id: user_id || null,
      customer_name,
      customer_dni,
      customer_phone,
      shipping_address,
      total: Number(total),
      order_status,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      items: savedItems,
      payment: savedPayment
    };

    res.status(201).json({
      message: 'Pedido y pago registrados exitosamente',
      order_id: orderId,
      order_code,
      order: createdOrder
    });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  }
});

export default router;
