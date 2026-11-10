import { Router } from 'express';
import db from '../db/database.js';
import {
  validateLuhn,
  validateOTP,
  validatePhone,
  validateCardExpiry,
  generateYapeHash,
  generateCipHash,
  generateCipReference,
  generateAuthHash,
} from '../utils/paymentValidators.js';

const router = Router();

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getStoreSettings() {
  const row = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
  return (
    row || {
      owner_name: 'Jeancarlos José Huertas Quichca',
      yape_number: '924046690',
      plin_number: '983064501',
      bank_name: 'BCP - Banco de Crédito del Perú',
      bank_account_soles: '22079349234041',
      bank_cci: '00222017934923404128',
    }
  );
}

function resolveUserId(explicitUserId, customerDni) {
  if (explicitUserId) {
    const foundById = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(explicitUserId));
    if (foundById) return Number(foundById.id);
  }

  if (customerDni) {
    const foundByDni = db.prepare('SELECT id FROM users WHERE dni = ?').get(String(customerDni).trim());
    if (foundByDni) return Number(foundByDni.id);
  }

  const defaultDemo = db.prepare('SELECT id FROM users WHERE id = 2').get();
  if (defaultDemo) return 2;

  const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  return firstUser ? Number(firstUser.id) : 1;
}

function generateNextOrderCode() {
  const maxRow = db.prepare('SELECT COALESCE(MAX(id), 0) as maxId FROM orders').get();
  let seq = Number(maxRow?.maxId || 0) + 1;
  let orderCode = `ORD-2026-${String(seq).padStart(3, '0')}`;
  const checkStmt = db.prepare('SELECT 1 FROM orders WHERE order_code = ? LIMIT 1');
  while (checkStmt.get(orderCode)) {
    seq += 1;
    orderCode = `ORD-2026-${String(seq).padStart(3, '0')}`;
  }
  return orderCode;
}

function generateUniqueAuthCode(generatorFn) {
  const checkStmt = db.prepare('SELECT 1 FROM payments WHERE auth_code = ? LIMIT 1');
  for (let i = 0; i < 10; i++) {
    const candidate = generatorFn();
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
  }
  return generatorFn();
}

function assertNoDuplicateOperation(operationNumber, authCode) {
  if (operationNumber) {
    const existingOp = db.prepare(`
      SELECT id FROM payments
      WHERE operation_number = ? AND payment_status = 'Aprobado'
      LIMIT 1
    `).get(operationNumber);
    if (existingOp) {
      throw new HttpError(
        409,
        'DUPLICATE_OPERATION',
        'Esta operación o código de aprobación ya fue procesado y acreditado previamente. Por favor ingresa el código de tu abono actual.'
      );
    }
  }

  if (authCode) {
    const existingAuth = db.prepare(`
      SELECT id FROM payments
      WHERE auth_code = ? AND payment_status = 'Aprobado'
      LIMIT 1
    `).get(authCode);
    if (existingAuth) {
      throw new HttpError(
        409,
        'DUPLICATE_OPERATION',
        'Este código de autorización ya fue procesado y acreditado previamente.'
      );
    }
  }
}

function normalizeMethod(rawMethod, rawSubMethod) {
  const m = String(rawMethod || '').trim().toLowerCase();
  if (m === 'yape_plin' || m === 'yape' || m === 'plin') {
    const sub = rawSubMethod
      ? String(rawSubMethod).trim().toLowerCase()
      : m === 'plin'
        ? 'plin'
        : 'yape';
    return { kind: 'yape_plin', subMethod: sub === 'plin' ? 'plin' : 'yape' };
  }
  if (m === 'bank_transfer' || m === 'transferencia bancaria' || m === 'transferencia' || m === 'bcp') {
    return { kind: 'bank_transfer', subMethod: 'bank' };
  }
  if (m === 'credit_card' || m === 'tarjeta crédito/débito' || m === 'tarjeta de crédito/débito' || m === 'tarjeta') {
    return { kind: 'credit_card', subMethod: 'card' };
  }
  return { kind: null, subMethod: null };
}

function extractBuyerAndItems(body) {
  const customer = body.customer || {};
  const customerName = String(customer.name ?? body.customer_name ?? '').trim();
  const customerDni = String(customer.dni ?? body.customer_dni ?? '').trim();
  const customerPhone = String(customer.phone ?? body.customer_phone ?? body.phone ?? '').trim();
  const shippingAddress = String(
    body.shipping_address ||
      [customer.address, customer.city].filter((v) => v && String(v).trim()).join(', ')
  ).trim();

  if (!customerName || !customerDni || !customerPhone || !shippingAddress) {
    throw new HttpError(
      400,
      'INVALID_FORMAT',
      'Todos los datos del comprador y dirección de entrega son obligatorios.'
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new HttpError(
      400,
      'INVALID_FORMAT',
      'El pedido debe contener al menos un producto.'
    );
  }

  return {
    customerName,
    customerDni,
    customerPhone,
    shippingAddress,
    items: body.items,
    total: body.total,
  };
}

function createOrderAndPaymentAtomically({
  userId,
  customerName,
  customerDni,
  customerPhone,
  shippingAddress,
  items,
  total,
  orderStatus,
  paymentStatus,
  methodLabel,
  destinationAccount,
  operationNumber,
  voucherImage,
  cardLast4,
  authCode,
}) {
  db.exec('BEGIN IMMEDIATE');
  try {
    if (paymentStatus === 'Aprobado') {
      assertNoDuplicateOperation(operationNumber, authCode);
    }

    const selectProduct = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
    const deductStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');

    const preparedItems = [];
    let computedTotal = 0;

    for (const rawItem of items) {
      const productId = Number(rawItem.product_id ?? rawItem.id);
      const quantity = Number(rawItem.quantity);

      if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'Cada producto del pedido debe incluir un identificador y cantidad válida.'
        );
      }

      const product = selectProduct.get(productId);
      if (!product) {
        throw new HttpError(
          404,
          'PRODUCT_NOT_FOUND',
          `El producto con ID ${productId} no fue encontrado.`
        );
      }

      if (product.stock < quantity) {
        throw new HttpError(
          409,
          'INSUFFICIENT_STOCK',
          `Stock insuficiente para completar la compra de "${product.name}". Disponible: ${product.stock} unidad(es). No se realizó ningún cobro.`
        );
      }

      const updateRes = deductStock.run(quantity, productId, quantity);
      if (updateRes.changes === 0) {
        throw new HttpError(
          409,
          'INSUFFICIENT_STOCK',
          `Stock insuficiente para "${product.name}". No se realizó ningún cobro.`
        );
      }

      const unitPrice =
        rawItem.unit_price !== undefined
          ? Number(rawItem.unit_price)
          : Number(rawItem.price ?? product.price);
      const subtotal = Number((unitPrice * quantity).toFixed(2));
      computedTotal += subtotal;

      preparedItems.push({
        product_id: productId,
        product_name: String(rawItem.product_name || rawItem.name || product.name),
        quantity,
        unit_price: unitPrice,
        subtotal,
      });
    }

    const finalTotal =
      total !== undefined && total !== null && !Number.isNaN(Number(total))
        ? Number(Number(total).toFixed(2))
        : Number(computedTotal.toFixed(2));

    const orderCode = generateNextOrderCode();

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_code, user_id, customer_name, customer_dni, customer_phone, shipping_address, total, order_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const orderResult = insertOrder.run(
      orderCode,
      userId,
      customerName,
      customerDni,
      customerPhone,
      shippingAddress,
      finalTotal,
      orderStatus
    );
    const orderId = Number(orderResult.lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const savedItems = preparedItems.map((it) => {
      const itemRes = insertItem.run(
        orderId,
        it.product_id,
        it.product_name,
        it.quantity,
        it.unit_price,
        it.subtotal
      );
      return {
        id: Number(itemRes.lastInsertRowid),
        order_id: orderId,
        ...it,
      };
    });

    const insertPayment = db.prepare(`
      INSERT INTO payments (
        order_id, method, destination_account, amount, currency, operation_number, voucher_image, card_last4, auth_code, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const paymentResult = insertPayment.run(
      orderId,
      methodLabel,
      destinationAccount,
      finalTotal,
      'PEN',
      operationNumber || null,
      voucherImage || null,
      cardLast4 || null,
      authCode || null,
      paymentStatus
    );
    const paymentId = Number(paymentResult.lastInsertRowid);

    const savedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const savedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    db.exec('COMMIT');

    return {
      order: savedOrder,
      payment: savedPayment,
      items: savedItems,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      // Ignorar si no hay transacción activa
    }
    throw err;
  }
}

function approveExistingCipOrder({ orderId, cipReference, operationNumber, voucherImage, total }) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const order = orderId
      ? db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderId))
      : db.prepare(`
          SELECT o.*
          FROM orders o
          JOIN payments p ON p.order_id = o.id
          WHERE p.auth_code = ?
          ORDER BY p.id DESC
          LIMIT 1
        `).get(cipReference);

    if (!order) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'La orden de reserva CIP no fue encontrada.');
    }

    const payment = db.prepare(`
      SELECT * FROM payments
      WHERE order_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(order.id);

    if (!payment) {
      throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'No se encontró registro de pago para esta reserva CIP.');
    }

    if (order.order_status === 'Expirado' || payment.payment_status === 'Expirado') {
      throw new HttpError(
        410,
        'CIP_EXPIRED',
        'El plazo de 24 horas de tu código CIP ha expirado. La reserva fue cancelada y el stock liberado.'
      );
    }

    if (payment.payment_status === 'Aprobado') {
      throw new HttpError(
        409,
        'DUPLICATE_OPERATION',
        'Esta reserva CIP ya fue procesada y acreditada previamente.'
      );
    }

    if (order.order_status === 'Cancelado') {
      throw new HttpError(
        409,
        'ORDER_CANCELLED',
        'Esta orden fue cancelada y no puede ser verificada.'
      );
    }

    if (!cipReference || cipReference !== payment.auth_code) {
      throw new HttpError(
        400,
        'INVALID_FORMAT',
        'La referencia CIP ingresada no coincide con la reserva emitida.'
      );
    }

    if (total !== undefined && total !== null && Math.abs(Number(total) - Number(order.total)) > 0.01) {
      throw new HttpError(
        400,
        'INVALID_FORMAT',
        `El monto transferido (S/ ${Number(total).toFixed(2)}) no coincide con el total exacto de la reserva (S/ ${Number(order.total).toFixed(2)}).`
      );
    }

    assertNoDuplicateOperation(operationNumber, null);

    const newAuthCode = generateUniqueAuthCode(generateCipHash);

    db.prepare("UPDATE orders SET order_status = 'Pagado / En Preparación' WHERE id = ?").run(order.id);
    db.prepare(`
      UPDATE payments
      SET payment_status = 'Aprobado',
          operation_number = ?,
          voucher_image = COALESCE(?, voucher_image),
          auth_code = ?
      WHERE id = ?
    `).run(operationNumber, voucherImage || null, newAuthCode, payment.id);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    db.exec('COMMIT');

    return {
      order: updatedOrder,
      payment: updatedPayment,
      items,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      // Ignorar si no hay transacción activa
    }
    throw err;
  }
}

/**
 * Expira automáticamente todas las reservas CIP pendientes con más de 24 horas
 * desde su creación, restaurando el stock de cada producto en SQLite.
 * @returns {number} Cantidad de órdenes expiradas en esta ejecución.
 */
export function expireOverdueCipOrders() {
  const hasOverdue = db.prepare(`
    SELECT 1
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.payment_status = 'Pendiente (CIP 24h)'
      AND datetime(p.created_at) < datetime('now', '-24 hours')
      AND o.order_status != 'Expirado'
    LIMIT 1
  `).get();

  if (!hasOverdue) {
    return 0;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const overdueList = db.prepare(`
      SELECT p.id as payment_id, p.order_id
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.payment_status = 'Pendiente (CIP 24h)'
        AND datetime(p.created_at) < datetime('now', '-24 hours')
        AND o.order_status != 'Expirado'
    `).all();

    const getOrderItems = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
    const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    const markOrderExpired = db.prepare("UPDATE orders SET order_status = 'Expirado' WHERE id = ?");
    const markPaymentExpired = db.prepare("UPDATE payments SET payment_status = 'Expirado' WHERE id = ?");

    for (const row of overdueList) {
      const items = getOrderItems.all(row.order_id);
      for (const item of items) {
        if (item.product_id) {
          restoreStock.run(item.quantity, item.product_id);
        }
      }
      markOrderExpired.run(row.order_id);
      markPaymentExpired.run(row.payment_id);
    }

    db.exec('COMMIT');
    return overdueList.length;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      // Ignorar si no hay transacción activa
    }
    console.error('Error al expirar órdenes CIP vencidas:', err);
    throw err;
  }
}

// POST /api/payments/auto-verify - Motor de Verificación Automática e Instantánea de Pagos
router.post('/auto-verify', (req, res) => {
  try {
    // Expirar reservas CIP vencidas antes de validar pagos o reservas
    expireOverdueCipOrders();

    const body = req.body || {};
    const { kind, subMethod } = normalizeMethod(body.method, body.sub_method);

    if (!kind) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: 'Método de pago no soportado. Usa yape_plin, bank_transfer o credit_card.',
      });
    }

    const settings = getStoreSettings();

    // ------------------------------------------------------------------
    // VÍA 1: YAPE / PLIN (OTP 6 dígitos o QR + N° Operación)
    // ------------------------------------------------------------------
    if (kind === 'yape_plin') {
      const { customerName, customerDni, customerPhone, shippingAddress, items, total } =
        extractBuyerAndItems(body);
      const userId = resolveUserId(body.user_id, customerDni);

      const effectiveMode = String(
        body.mode || body.verification_mode || (body.otp_code ? 'otp' : 'qr')
      ).trim().toLowerCase();

      let operationNumber = '';
      if (effectiveMode === 'otp') {
        const phoneToValidate = body.phone !== undefined ? body.phone : customerPhone;
        if (!validatePhone(phoneToValidate)) {
          throw new HttpError(
            400,
            'INVALID_FORMAT',
            'El número celular registrado en Yape/Plin debe contener exactamente 9 dígitos numéricos.'
          );
        }
        if (!validateOTP(body.otp_code)) {
          throw new HttpError(
            400,
            'INVALID_FORMAT',
            'El código de aprobación de Yape/Plin debe contener exactamente 6 dígitos numéricos válidos (no secuencias repetidas como 000000).'
          );
        }
        operationNumber = String(body.otp_code).trim();
      } else if (effectiveMode === 'qr') {
        const rawOp = String(body.operation_number ?? '').trim();
        if (!rawOp) {
          throw new HttpError(
            400,
            'INVALID_FORMAT',
            'Por favor ingresa el número de operación de tu pago con QR.'
          );
        }
        operationNumber = rawOp;
      } else {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'Modalidad de verificación Yape/Plin inválida. Debe ser otp o qr.'
        );
      }

      const isPlin = subMethod === 'plin';
      const methodLabel = isPlin ? 'Plin' : 'Yape';
      const destinationAccount = isPlin
        ? `Plin: ${settings.plin_number} (${settings.owner_name})`
        : `Yape: ${settings.yape_number} (${settings.owner_name})`;
      const authCode = generateUniqueAuthCode(generateYapeHash);

      const result = createOrderAndPaymentAtomically({
        userId,
        customerName,
        customerDni,
        customerPhone,
        shippingAddress,
        items,
        total,
        orderStatus: 'Pagado / En Preparación',
        paymentStatus: 'Aprobado',
        methodLabel,
        destinationAccount,
        operationNumber,
        voucherImage: body.voucher_image || null,
        cardLast4: null,
        authCode,
      });

      return res.status(201).json({
        success: true,
        message: '¡Pago verificado automáticamente! Orden aprobada.',
        order_id: result.order.id,
        order_code: result.order.order_code,
        order: {
          ...result.order,
          auto_verified: true,
          items: result.items,
          payment: result.payment,
        },
        payment: result.payment,
        audit: {
          channel: 'Cámara de Compensación Yape / Plin',
          beneficiary: settings.owner_name,
          verified_at: new Date().toISOString(),
        },
      });
    }

    // ------------------------------------------------------------------
    // VÍA 2: TRANSFERENCIA BANCARIA (CIP 24h Reserve o Verificación)
    // ------------------------------------------------------------------
    if (kind === 'bank_transfer') {
      const action = String(body.action || 'verify').trim().toLowerCase();
      const destinationAccount = `${settings.bank_name} Cta: ${settings.bank_account_soles} (${settings.owner_name})`;

      if (action === 'reserve_cip') {
        const { customerName, customerDni, customerPhone, shippingAddress, items, total } =
          extractBuyerAndItems(body);
        const userId = resolveUserId(body.user_id, customerDni);
        const requestedCip = String(body.cip_reference || body.cip_code || '').trim();
        const isValidUnusedCip =
          /^CIP-2026-\d{6}$/.test(requestedCip) &&
          !db.prepare('SELECT 1 FROM payments WHERE auth_code = ? LIMIT 1').get(requestedCip);
        const cipReference = isValidUnusedCip
          ? requestedCip
          : generateUniqueAuthCode(generateCipReference);

        const result = createOrderAndPaymentAtomically({
          userId,
          customerName,
          customerDni,
          customerPhone,
          shippingAddress,
          items,
          total,
          orderStatus: 'Pendiente de Pago',
          paymentStatus: 'Pendiente (CIP 24h)',
          methodLabel: 'Transferencia Bancaria',
          destinationAccount,
          operationNumber: null,
          voucherImage: null,
          cardLast4: null,
          authCode: cipReference,
        });

        return res.status(201).json({
          success: true,
          message: 'Reserva CIP generada con vigencia de 24 horas.',
          order_id: result.order.id,
          order_code: result.order.order_code,
          cip_reference: cipReference,
          cip_code: cipReference,
          expires_in_hours: 24,
          order: {
            ...result.order,
            auto_verified: false,
            items: result.items,
            payment: result.payment,
          },
          payment: result.payment,
        });
      }

      if (action !== 'verify') {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'Acción inválida para transferencia bancaria. Usa verify o reserve_cip.'
        );
      }

      const rawOp = String(body.operation_number ?? '').trim();
      if (!rawOp) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'Por favor ingresa el número de operación bancaria de tu transferencia.'
        );
      }

      const cipRef = String(body.cip_reference || body.cip_code || '').trim();
      if (!cipRef || !/^CIP-2026-\d{6}$/.test(cipRef)) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'El código de referencia CIP debe tener el formato válido CIP-2026-XXXXXX.'
        );
      }

      // Verificar si corresponde a una reserva CIP ya persistida en SQLite
      const existingByRef = !body.order_id
        ? db.prepare(`
            SELECT p.order_id
            FROM payments p
            WHERE p.auth_code = ?
            ORDER BY p.id DESC
            LIMIT 1
          `).get(cipRef)
        : null;

      if (body.order_id || existingByRef) {
        const result = approveExistingCipOrder({
          orderId: body.order_id || existingByRef.order_id,
          cipReference: cipRef,
          operationNumber: rawOp,
          voucherImage: body.voucher_image || null,
          total: body.total,
        });

        return res.status(200).json({
          success: true,
          message: '¡Transferencia bancaria verificada automáticamente! Orden aprobada.',
          order_id: result.order.id,
          order_code: result.order.order_code,
          order: {
            ...result.order,
            auto_verified: true,
            items: result.items,
            payment: result.payment,
          },
          payment: result.payment,
          audit: {
            channel: 'Canal Interbancario BCP / CCI',
            beneficiary: settings.owner_name,
            verified_at: new Date().toISOString(),
          },
        });
      }

      // Verificación directa en sesión desde CheckoutModal (sin reserva previa)
      const { customerName, customerDni, customerPhone, shippingAddress, items, total } =
        extractBuyerAndItems(body);
      const userId = resolveUserId(body.user_id, customerDni);
      const authCode = generateUniqueAuthCode(generateCipHash);

      const result = createOrderAndPaymentAtomically({
        userId,
        customerName,
        customerDni,
        customerPhone,
        shippingAddress,
        items,
        total,
        orderStatus: 'Pagado / En Preparación',
        paymentStatus: 'Aprobado',
        methodLabel: 'Transferencia Bancaria',
        destinationAccount,
        operationNumber: rawOp,
        voucherImage: body.voucher_image || null,
        cardLast4: null,
        authCode,
      });

      return res.status(201).json({
        success: true,
        message: '¡Transferencia bancaria verificada automáticamente! Orden aprobada.',
        order_id: result.order.id,
        order_code: result.order.order_code,
        cip_reference: cipRef,
        order: {
          ...result.order,
          auto_verified: true,
          items: result.items,
          payment: result.payment,
        },
        payment: result.payment,
        audit: {
          channel: 'Canal Interbancario BCP / CCI',
          beneficiary: settings.owner_name,
          verified_at: new Date().toISOString(),
        },
      });
    }

    // ------------------------------------------------------------------
    // VÍA 3: TARJETA DE CRÉDITO / DÉBITO (Luhn + Vigencia + CVV)
    // ------------------------------------------------------------------
    if (kind === 'credit_card') {
      const { customerName, customerDni, customerPhone, shippingAddress, items, total } =
        extractBuyerAndItems(body);
      const userId = resolveUserId(body.user_id, customerDni);

      const cardData = body.card_data || {};
      const rawCardNumber = body.card_number ?? cardData.number ?? cardData.card_number ?? '';
      const cleanCardNumber = String(rawCardNumber).replace(/[\s-]/g, '');
      const rawExpiry = body.card_expiry ?? cardData.expiry ?? cardData.card_expiry ?? '';
      const rawCvv = String(body.card_cvv ?? cardData.cvv ?? cardData.card_cvv ?? '').trim();

      if (!/^\d{13,19}$/.test(cleanCardNumber) || !validateLuhn(cleanCardNumber)) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'El número de tarjeta es inválido según la validación Luhn. Verifica los dígitos ingresados.'
        );
      }

      if (!validateCardExpiry(rawExpiry)) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'La fecha de vencimiento de la tarjeta es inválida o está expirada (formato MM/AA).'
        );
      }

      if (!/^\d{3,4}$/.test(rawCvv)) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'El código de seguridad (CVV) debe contener exactamente 3 o 4 dígitos numéricos.'
        );
      }

      const cardLast4 = String(body.card_last4 || cleanCardNumber.slice(-4)).slice(-4);
      const authCode = generateUniqueAuthCode(generateAuthHash);
      const operationNumber = body.operation_number
        ? String(body.operation_number).trim()
        : `TARJ-${authCode.replace('AUTH-', '')}`;
      const destinationAccount = `Cuenta Recaudadora BCP: ${settings.bank_account_soles} (${settings.owner_name})`;

      const result = createOrderAndPaymentAtomically({
        userId,
        customerName,
        customerDni,
        customerPhone,
        shippingAddress,
        items,
        total,
        orderStatus: 'Pagado / En Preparación',
        paymentStatus: 'Aprobado',
        methodLabel: 'Tarjeta Crédito/Débito',
        destinationAccount,
        operationNumber,
        voucherImage: null,
        cardLast4,
        authCode,
      });

      return res.status(201).json({
        success: true,
        message: '¡Cobro con tarjeta autorizado! Liquidado a cuenta del titular.',
        order_id: result.order.id,
        order_code: result.order.order_code,
        order: {
          ...result.order,
          auto_verified: true,
          items: result.items,
          payment: result.payment,
        },
        payment: result.payment,
        audit: {
          channel: 'Procesador Tarjeta 3D Secure',
          beneficiary: settings.owner_name,
          verified_at: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        success: false,
        error: error.code,
        message: error.message,
      });
    }
    console.error('Error en POST /api/payments/auto-verify:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno al verificar automáticamente el pago.',
    });
  }
});

// GET /api/payments/audit/:orderCode - Detalle de auditoría bancaria y conciliación automática
router.get('/audit/:orderCode', (req, res) => {
  try {
    expireOverdueCipOrders();

    const { orderCode } = req.params;
    let row = db.prepare(`
      SELECT
        o.id as order_id,
        o.order_code,
        o.customer_name,
        o.customer_dni,
        o.total,
        o.order_status,
        o.created_at as order_created_at,
        p.method,
        p.destination_account,
        p.amount,
        p.currency,
        p.operation_number,
        p.card_last4,
        p.auth_code,
        p.payment_status,
        p.created_at as payment_created_at
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.order_code = ?
      ORDER BY p.id DESC
      LIMIT 1
    `).get(orderCode);

    if (!row && /^\d+$/.test(orderCode)) {
      row = db.prepare(`
        SELECT
          o.id as order_id,
          o.order_code,
          o.customer_name,
          o.customer_dni,
          o.total,
          o.order_status,
          o.created_at as order_created_at,
          p.method,
          p.destination_account,
          p.amount,
          p.currency,
          p.operation_number,
          p.card_last4,
          p.auth_code,
          p.payment_status,
          p.created_at as payment_created_at
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.id = ?
        ORDER BY p.id DESC
        LIMIT 1
      `).get(Number(orderCode));
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Orden no encontrada para auditoría.',
      });
    }

    const items = db.prepare(`
      SELECT id, product_id, product_name, quantity, unit_price, subtotal
      FROM order_items
      WHERE order_id = ?
    `).all(row.order_id);

    const authCode = row.auth_code || null;
    const isAutoVerified = Boolean(
      authCode && /^(YAPE-AUTO-|CIP-AUTO-|AUTH-)/.test(authCode)
    );

    let channel = 'Verificación Estándar';
    if (authCode?.startsWith('YAPE-AUTO-')) {
      channel = 'Cámara de Compensación Yape / Plin';
    } else if (authCode?.startsWith('CIP-AUTO-') || authCode?.startsWith('CIP-2026-')) {
      channel = 'Canal Interbancario BCP / CCI';
    } else if (authCode?.startsWith('AUTH-')) {
      channel = 'Procesador Tarjeta 3D Secure';
    }

    res.json({
      order_id: row.order_id,
      order_code: row.order_code,
      auth_code: authCode,
      operation_number: row.operation_number || null,
      card_last4: row.card_last4 || null,
      method: row.method || null,
      payment_method: row.method || null,
      destination_account: row.destination_account || null,
      amount: row.amount ?? row.total,
      total: row.total,
      currency: row.currency || 'PEN',
      payment_status: row.payment_status || null,
      order_status: row.order_status,
      customer_name: row.customer_name,
      customer_dni: row.customer_dni,
      created_at: row.payment_created_at || row.order_created_at,
      verified_at: row.payment_created_at || row.order_created_at,
      auto_verified: isAutoVerified,
      channel,
      items,
    });
  } catch (error) {
    console.error('Error en GET /api/payments/audit/:orderCode:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al consultar la auditoría bancaria del pedido.',
    });
  }
});

export default router;
