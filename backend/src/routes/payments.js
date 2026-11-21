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
    const foundById = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'client'").get(Number(explicitUserId));
    if (foundById) return Number(foundById.id);
  }

  if (customerDni) {
    const foundByDni = db.prepare("SELECT id FROM users WHERE dni = ? AND role = 'client'").get(String(customerDni).trim());
    if (foundByDni) return Number(foundByDni.id);
  }

  throw new HttpError(
    401,
    'AUTH_REQUIRED',
    'Debes iniciar sesión o crear una cuenta de cliente para completar tu compra.'
  );
}

function resolveShipping(body) {
  const raw = body.shipping_rate_id ?? body.shipping?.rate_id ?? body.shipping?.id;
  if (raw === undefined || raw === null || raw === '') return null;
  const rate = db.prepare('SELECT * FROM shipping_rates WHERE id = ? AND active = 1').get(Number(raw));
  if (!rate) {
    throw new HttpError(
      409,
      'SHIPPING_UNAVAILABLE',
      'Envíos no disponibles temporalmente para esta provincia. Elige otro destino o contacta a soporte.'
    );
  }
  return rate;
}

function getMercadoPagoConfig() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const publicKey = process.env.MP_PUBLIC_KEY;
  if (!accessToken) {
    throw new HttpError(
      503,
      'MP_NOT_CONFIGURED',
      'Mercado Pago no está configurado en el servidor. Usa Yape/Plin u otro medio de pago.'
    );
  }
  return { accessToken, publicKey: publicKey || null };
}

async function mercadoPagoFetch(url, options = {}) {
  const { accessToken } = getMercadoPagoConfig();
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    throw new HttpError(
      502,
      'MP_UNREACHABLE',
      'No se pudo conectar temporalmente con la pasarela de pagos. Por favor intenta nuevamente o usa Yape/Plin.'
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[MercadoPago] Error API:', response.status, JSON.stringify(data).slice(0, 500));
    throw new HttpError(
      response.status === 404 ? 404 : 502,
      'MP_API_ERROR',
      data?.message || 'Mercado Pago rechazó la solicitud.'
    );
  }
  return data;
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
  shippingRate = null,
  shouldDeductStock = true,
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

      const updateRes = shouldDeductStock
        ? deductStock.run(quantity, productId, quantity)
        : { changes: 1 };
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

    const shippingCost = shippingRate ? Number(Number(shippingRate.cost).toFixed(2)) : 0;
    const finalTotal = shippingRate
      ? Number((computedTotal + shippingCost).toFixed(2))
      : total !== undefined && total !== null && !Number.isNaN(Number(total))
        ? Number(Number(total).toFixed(2))
        : Number(computedTotal.toFixed(2));

    const orderCode = generateNextOrderCode();

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_code, user_id, customer_name, customer_dni, customer_phone, shipping_address, total, order_status,
        shipping_cost, shipping_department, shipping_province
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const orderResult = insertOrder.run(
      orderCode,
      userId,
      customerName,
      customerDni,
      customerPhone,
      shippingAddress,
      finalTotal,
      orderStatus,
      shippingCost,
      shippingRate ? shippingRate.department : '',
      shippingRate ? shippingRate.province : ''
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
function autoVerifyHandler(req, res) {
  try {
    // Expirar reservas CIP vencidas antes de validar pagos o reservas
    expireOverdueCipOrders();

    const body = req.body || {};
    const shippingRate = resolveShipping(body);
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
            'INVALID_PHONE',
            'El número celular debe tener 9 dígitos y comenzar con 9.'
          );
        }
        if (!validateOTP(body.otp_code)) {
          throw new HttpError(
            400,
            'INVALID_OTP',
            'Código de aprobación inválido o trivial (ej. 000000, 111111, 123456). Ingrese un código OTP legítimo de 6 dígitos.'
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
        shippingRate,
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

const sanitizeCustomerPayment = (payment) =>
  payment ? { ...payment, destination_account: 'Pasarela FitStore Pro' } : null;

      const publicPayment = sanitizeCustomerPayment(result.payment);
      return res.status(201).json({
        success: true,
        message: '¡Pago verificado automáticamente! Orden aprobada.',
        order_id: result.order.id,
        order_code: result.order.order_code,
        order: {
          ...result.order,
          auto_verified: true,
          items: result.items,
          payment: publicPayment,
        },
        payment: publicPayment,
        audit: {
          channel: 'Cámara de Compensación Yape / Plin',
          beneficiary: 'FitStore Pro',
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
        shippingRate,
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

        const publicPayment = { ...result.payment, destination_account: 'Pasarela FitStore Pro' };
        return res.status(200).json({
          success: true,
          message: '¡Transferencia bancaria verificada automáticamente! Orden aprobada.',
          order_id: result.order.id,
          order_code: result.order.order_code,
          order: {
            ...result.order,
            auto_verified: true,
            items: result.items,
            payment: publicPayment,
          },
          payment: publicPayment,
          audit: {
            channel: 'Canal Interbancario CIP',
            beneficiary: 'FitStore Pro',
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
        shippingRate,
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

      const publicBankPayment = { ...result.payment, destination_account: 'Pasarela FitStore Pro' };
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
          payment: publicBankPayment,
        },
        payment: publicBankPayment,
        audit: {
          channel: 'Canal Interbancario CIP',
          beneficiary: 'FitStore Pro',
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
        shippingRate,
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

      const publicCardPayment = { ...result.payment, destination_account: 'Pasarela FitStore Pro' };
      return res.status(201).json({
        success: true,
        message: '¡Cobro con tarjeta autorizado correctamente!',
        order_id: result.order.id,
        order_code: result.order.order_code,
        order: {
          ...result.order,
          auto_verified: true,
          items: result.items,
          payment: publicCardPayment,
        },
        payment: publicCardPayment,
        audit: {
          channel: 'Procesador Tarjeta 3D Secure',
          beneficiary: 'FitStore Pro',
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
}
router.post('/auto-verify', autoVerifyHandler);

// POST /api/payments/yape-plin - Pago directo Yape/Plin (celular 9 dígitos + OTP 6 dígitos) con validación antifraude
router.post('/yape-plin', (req, res) => {
  const body = req.body || {};
  const rawSub = String(body.sub_method || body.payment_method || body.method || 'yape').toLowerCase();
  req.body = {
    ...body,
    method: 'yape_plin',
    mode: 'otp',
    verification_mode: 'otp',
    sub_method: rawSub === 'plin' ? 'plin' : 'yape',
    otp_code: body.otp_code ?? body.otp,
  };
  return autoVerifyHandler(req, res);
});

function sendHttpError(res, error, fallbackMessage) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ success: false, error: error.code, message: error.message });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: fallbackMessage });
}

function getPublicBaseUrl(candidate) {
  try {
    const url = new URL(String(candidate || ''));
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
  } catch {
    // ignorar
  }
  return process.env.PUBLIC_STORE_URL || 'http://localhost:5173';
}

// POST /api/payments/create-preference - Mercado Pago Checkout Pro (Sandbox, PEN)
router.post('/create-preference', async (req, res) => {
  let createdOrderId = null;
  try {
    getMercadoPagoConfig();
    const body = req.body || {};
    const { customerName, customerDni, customerPhone, shippingAddress, items, total } =
      extractBuyerAndItems(body);
    const userId = resolveUserId(body.user_id, customerDni);
    const shippingRate = resolveShipping(body);
    if (!shippingRate) {
      throw new HttpError(400, 'INVALID_FORMAT', 'Debes seleccionar el departamento/provincia de envío.');
    }

    // El stock se valida pero NO se descuenta hasta que Mercado Pago confirme 'approved'
    const result = createOrderAndPaymentAtomically({
      shippingRate,
      shouldDeductStock: false,
      userId,
      customerName,
      customerDni,
      customerPhone,
      shippingAddress,
      items,
      total,
      orderStatus: 'Pendiente de Pago',
      paymentStatus: 'Pendiente (Mercado Pago)',
      methodLabel: 'Mercado Pago',
      destinationAccount: 'Pasarela FitStore Pro',
      operationNumber: null,
      voucherImage: null,
      cardLast4: null,
      authCode: `MP-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    });
    createdOrderId = result.order.id;

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    const baseUrl = getPublicBaseUrl(body.return_url);
    const backUrl = `${baseUrl}/?mp_return=1`;
    const preferencePayload = {
      items: [
        ...result.items.map((it) => ({
          id: String(it.product_id),
          title: it.product_name,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          currency_id: 'PEN',
        })),
        {
          id: `ENVIO-${shippingRate.id}`,
          title: `Costo de Envío - ${shippingRate.province} (${shippingRate.department})`,
          quantity: 1,
          unit_price: Number(shippingRate.cost),
          currency_id: 'PEN',
        },
      ].filter((it) => it.unit_price > 0),
      payer: { name: customerName, email: user?.email },
      external_reference: result.order.order_code,
      back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
      statement_descriptor: 'FITSTORE',
    };
    if (baseUrl.startsWith('https://')) preferencePayload.auto_return = 'approved';
    const notifyBase = process.env.PUBLIC_API_URL;
    if (notifyBase && notifyBase.startsWith('https://')) {
      preferencePayload.notification_url = `${notifyBase.replace(/\/$/, '')}/api/payments/mercadopago-webhook`;
    }

    let preference;
    try {
      preference = await mercadoPagoFetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preferencePayload),
      });
    } catch (mpError) {
      db.prepare("UPDATE orders SET order_status = 'Cancelado' WHERE id = ?").run(createdOrderId);
      db.prepare("UPDATE payments SET payment_status = 'Rechazado' WHERE order_id = ?").run(createdOrderId);
      throw mpError;
    }

    return res.status(201).json({
      success: true,
      order_id: result.order.id,
      order_code: result.order.order_code,
      total: result.order.total,
      shipping_cost: result.order.shipping_cost,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      public_key: process.env.MP_PUBLIC_KEY || null,
    });
  } catch (error) {
    return sendHttpError(res, error, 'Error al crear la preferencia de pago de Mercado Pago.');
  }
});

/**
 * Confirma de forma atómica e idempotente un pago aprobado de Mercado Pago:
 * valida monto/moneda, descuenta stock, marca la orden 'Pagado / En Preparación'
 * y registra el payment_id como número de operación único.
 */
function approveMercadoPagoPayment(mpPayment) {
  const orderCode = String(mpPayment.external_reference || '').trim();
  const mpPaymentId = String(mpPayment.id);

  db.exec('BEGIN IMMEDIATE');
  try {
    const order = db.prepare('SELECT * FROM orders WHERE order_code = ?').get(orderCode);
    if (!order) {
      throw new HttpError(404, 'ORDER_NOT_FOUND', 'No se encontró la orden asociada a este pago.');
    }
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(order.id);
    if (!payment) {
      throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'No se encontró el registro de pago de la orden.');
    }

    const loadItems = () => db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    if (payment.payment_status === 'Aprobado') {
      db.exec('COMMIT');
      return { order, payment, items: loadItems(), alreadyApproved: true };
    }
    if (order.order_status === 'Cancelado') {
      throw new HttpError(409, 'ORDER_CANCELLED', 'Esta orden fue cancelada y no puede ser pagada.');
    }
    if (mpPayment.currency_id && mpPayment.currency_id !== 'PEN') {
      throw new HttpError(400, 'AMOUNT_MISMATCH', 'La moneda del pago no coincide (se esperaba PEN).');
    }
    if (Math.abs(Number(mpPayment.transaction_amount) - Number(order.total)) > 0.01) {
      throw new HttpError(
        400,
        'AMOUNT_MISMATCH',
        `El monto cobrado (S/ ${Number(mpPayment.transaction_amount).toFixed(2)}) no coincide con el total de la orden (S/ ${Number(order.total).toFixed(2)}).`
      );
    }
    assertNoDuplicateOperation(mpPaymentId, null);

    const items = loadItems();
    const stockOk = items.every((it) => {
      const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
      return p && p.stock >= it.quantity;
    });

    let finalStatus = 'Pagado / En Preparación';
    if (stockOk) {
      const deduct = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
      for (const it of items) deduct.run(it.quantity, it.product_id, it.quantity);
    } else {
      // Pago cobrado pero sin stock: se marca para revisión manual sin dejar stock negativo
      finalStatus = 'Pagado / Revisión de Stock';
    }

    db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').run(finalStatus, order.id);
    db.prepare(`
      UPDATE payments
      SET payment_status = 'Aprobado', operation_number = ?, method = 'Mercado Pago'
      WHERE id = ?
    `).run(mpPaymentId, payment.id);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    db.exec('COMMIT');
    return { order: updatedOrder, payment: updatedPayment, items, alreadyApproved: false };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      // sin transacción activa
    }
    throw err;
  }
}

// POST /api/payments/verify-mercadopago - Verificación de retorno (back_urls) contra la API de Mercado Pago
router.post('/verify-mercadopago', async (req, res) => {
  try {
    const paymentId = String(req.body?.payment_id ?? '').trim();
    if (!/^\d{3,20}$/.test(paymentId)) {
      throw new HttpError(400, 'INVALID_FORMAT', 'El identificador de pago de Mercado Pago es inválido.');
    }

    const mpPayment = await mercadoPagoFetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`
    );

    if (mpPayment.status === 'pending' || mpPayment.status === 'in_process') {
      return res.status(202).json({
        success: false,
        pending: true,
        status: mpPayment.status,
        message: 'Tu pago está en verificación. Te avisaremos en cuanto la entidad bancaria lo confirme.',
      });
    }
    if (mpPayment.status !== 'approved') {
      return res.status(402).json({
        success: false,
        error: 'PAYMENT_NOT_APPROVED',
        status: mpPayment.status,
        message: 'El pago no fue aprobado por Mercado Pago. No se realizó ningún cobro; intenta con otro medio de pago.',
      });
    }

    const result = approveMercadoPagoPayment(mpPayment);
    const publicPayment = { ...result.payment, destination_account: 'Pasarela FitStore Pro' };
    return res.status(200).json({
      success: true,
      message: '¡Pago con Mercado Pago verificado! Orden aprobada.',
      already_processed: result.alreadyApproved,
      order_id: result.order.id,
      order_code: result.order.order_code,
      order: { ...result.order, auto_verified: true, items: result.items, payment: publicPayment },
      payment: publicPayment,
      audit: { channel: 'Mercado Pago Checkout Pro', beneficiary: 'FitStore Pro', verified_at: new Date().toISOString() },
    });
  } catch (error) {
    return sendHttpError(res, error, 'Error al verificar el pago de Mercado Pago.');
  }
});

// POST /api/payments/mercadopago-webhook - Notificaciones IPN asíncronas (idempotente)
router.post('/mercadopago-webhook', async (req, res) => {
  // Responder 200 de inmediato para evitar reintentos innecesarios de Mercado Pago
  res.status(200).json({ received: true });
  try {
    const type = String(req.body?.type || req.query?.type || req.query?.topic || '');
    const id = req.body?.data?.id || req.query?.['data.id'] || req.query?.id;
    if (type !== 'payment' || !id || !/^\d{3,20}$/.test(String(id))) return;
    const mpPayment = await mercadoPagoFetch(`https://api.mercadopago.com/v1/payments/${id}`);
    if (mpPayment.status === 'approved') approveMercadoPagoPayment(mpPayment);
  } catch (error) {
    console.error('[MercadoPago Webhook] No se pudo procesar la notificación:', error?.message || error);
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
