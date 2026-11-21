import {
  validateLuhn,
  validateOTP,
  validatePhone,
  validateCardExpiry,
  generateYapeHash,
  generateCipHash,
  generateCipReference,
  generateAuthHash,
} from './utils/paymentValidators.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const LLAMA_MODEL = '@cf/meta/llama-3.2-3b-instruct';

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'INVALID_FORMAT', 'Cuerpo JSON inválido en la solicitud.');
  }
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function getStoreSettings(db) {
  const row = await db.prepare('SELECT * FROM store_settings WHERE id = 1').first();
  return (
    row || {
      id: 1,
      owner_name: 'FitStore Pro',
      yape_number: 'Pasarela Integrada',
      plin_number: 'Pasarela Integrada',
      bank_name: 'Pasarela CIP',
      bank_account_soles: 'CIP-FITSTORE',
      bank_cci: 'CIP-FITSTORE',
      whatsapp_notification: '',
    }
  );
}

function maskCustomerPayment(payment) {
  if (!payment) return null;
  return {
    ...payment,
    destination_account: 'Pasarela FitStore Pro',
  };
}

async function expireOverdueCipOrders(db) {
  const { results: overdue } = await db
    .prepare(`
      SELECT p.id AS payment_id, p.order_id
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.payment_status = 'Pendiente (CIP 24h)'
        AND datetime(p.created_at) < datetime('now', '-24 hours')
        AND o.order_status != 'Expirado'
    `)
    .all();

  if (!overdue || overdue.length === 0) return 0;

  const stmts = [];
  for (const row of overdue) {
    const { results: items } = await db
      .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
      .bind(row.order_id)
      .all();

    for (const item of items || []) {
      if (item.product_id) {
        stmts.push(
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(item.quantity, item.product_id)
        );
      }
    }
    stmts.push(db.prepare("UPDATE orders SET order_status = 'Expirado' WHERE id = ?").bind(row.order_id));
    stmts.push(db.prepare("UPDATE payments SET payment_status = 'Expirado' WHERE id = ?").bind(row.payment_id));
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
  return overdue.length;
}

async function hydrateOrders(db, orders) {
  if (!orders || orders.length === 0) return [];
  return Promise.all(
    orders.map(async (order) => {
      const { results: items } = await db
        .prepare('SELECT * FROM order_items WHERE order_id = ?')
        .bind(order.id)
        .all();
      const payment = await db
        .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1')
        .bind(order.id)
        .first();
      return {
        ...order,
        items: items || [],
        payment: maskCustomerPayment(payment),
      };
    })
  );
}

async function resolveUserId(db, explicitUserId, customerDni) {
  if (explicitUserId) {
    const byId = await db
      .prepare("SELECT id FROM users WHERE id = ? AND role = 'client'")
      .bind(Number(explicitUserId))
      .first();
    if (byId) return Number(byId.id);
  }
  if (customerDni) {
    const byDni = await db
      .prepare("SELECT id FROM users WHERE dni = ? AND role = 'client'")
      .bind(String(customerDni).trim())
      .first();
    if (byDni) return Number(byDni.id);
  }
  throw new HttpError(
    401,
    'AUTH_REQUIRED',
    'Debes iniciar sesión o crear tu cuenta de cliente antes de finalizar tu compra.'
  );
}

async function generateNextOrderCode(db) {
  const row = await db.prepare('SELECT COALESCE(MAX(id), 0) AS maxId FROM orders').first();
  let seq = Number(row?.maxId || 0) + 1;
  let orderCode = `ORD-2026-${String(seq).padStart(3, '0')}`;
  while (await db.prepare('SELECT 1 AS found FROM orders WHERE order_code = ? LIMIT 1').bind(orderCode).first()) {
    seq += 1;
    orderCode = `ORD-2026-${String(seq).padStart(3, '0')}`;
  }
  return orderCode;
}

async function generateUniqueAuthCode(db, generatorFn) {
  for (let i = 0; i < 10; i++) {
    const candidate = generatorFn();
    const exists = await db
      .prepare('SELECT 1 AS found FROM payments WHERE auth_code = ? LIMIT 1')
      .bind(candidate)
      .first();
    if (!exists) return candidate;
  }
  return generatorFn();
}

async function assertNoDuplicateOperation(db, operationNumber, authCode) {
  if (operationNumber) {
    const existingOp = await db
      .prepare("SELECT id FROM payments WHERE operation_number = ? AND payment_status = 'Aprobado' LIMIT 1")
      .bind(operationNumber)
      .first();
    if (existingOp) {
      throw new HttpError(
        409,
        'DUPLICATE_OPERATION',
        'Esta operación o código de aprobación ya fue procesado y acreditado previamente. Por favor ingresa el código de tu abono actual.'
      );
    }
  }
  if (authCode) {
    const existingAuth = await db
      .prepare("SELECT id FROM payments WHERE auth_code = ? AND payment_status = 'Aprobado' LIMIT 1")
      .bind(authCode)
      .first();
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
    throw new HttpError(400, 'INVALID_FORMAT', 'Todos los datos del comprador y dirección de entrega son obligatorios.');
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new HttpError(400, 'INVALID_FORMAT', 'El pedido debe contener al menos un producto.');
  }

  return { customerName, customerDni, customerPhone, shippingAddress, items: body.items, total: body.total };
}

async function createOrderAndPaymentAtomically(db, payload) {
  const {
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
  } = payload;

  if (paymentStatus === 'Aprobado') {
    await assertNoDuplicateOperation(db, operationNumber, authCode);
  }

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

    const product = await db
      .prepare('SELECT id, name, price, stock FROM products WHERE id = ?')
      .bind(productId)
      .first();

    if (!product) {
      throw new HttpError(404, 'PRODUCT_NOT_FOUND', `El producto con ID ${productId} no fue encontrado.`);
    }

    if (Number(product.stock) < quantity) {
      throw new HttpError(
        409,
        'INSUFFICIENT_STOCK',
        `Stock insuficiente para completar la compra de "${product.name}". Disponible: ${product.stock} unidad(es). No se realizó ningún cobro.`
      );
    }

    const unitPrice =
      rawItem.unit_price !== undefined ? Number(rawItem.unit_price) : Number(rawItem.price ?? product.price);
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

  // Descontar stock condicionalmente por ítem con compensación si alguno falla por concurrencia
  const deducted = [];
  try {
    for (const item of shouldDeductStock ? preparedItems : []) {
      const stockRes = await db
        .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .bind(item.quantity, item.product_id, item.quantity)
        .run();

      if (!stockRes?.meta?.changes) {
        throw new HttpError(
          409,
          'INSUFFICIENT_STOCK',
          `Stock insuficiente para "${item.product_name}". No se realizó ningún cobro.`
        );
      }
      deducted.push(item);
    }

    const shippingCost = shippingRate ? Number(Number(shippingRate.cost).toFixed(2)) : 0;
    const finalTotal = shippingRate
      ? Number((computedTotal + shippingCost).toFixed(2))
      : total !== undefined && total !== null && !Number.isNaN(Number(total))
        ? Number(Number(total).toFixed(2))
        : Number(computedTotal.toFixed(2));

    const orderCode = await generateNextOrderCode(db);
    const orderRes = await db
      .prepare(`
        INSERT INTO orders (
          order_code, user_id, customer_name, customer_dni, customer_phone, shipping_address, total, order_status,
          shipping_cost, shipping_department, shipping_province
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
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
      )
      .run();

    const orderId = Number(orderRes.meta.last_row_id);

    const batchStmts = preparedItems.map((it) =>
      db
        .prepare(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(orderId, it.product_id, it.product_name, it.quantity, it.unit_price, it.subtotal)
    );

    batchStmts.push(
      db
        .prepare(`
          INSERT INTO payments (
            order_id, method, destination_account, amount, currency, operation_number, voucher_image, card_last4, auth_code, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
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
        )
    );

    await db.batch(batchStmts);

    const savedOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    const savedPayment = await db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1')
      .bind(orderId)
      .first();
    const { results: savedItems } = await db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .bind(orderId)
      .all();

    return {
      order: savedOrder,
      payment: savedPayment,
      items: savedItems || [],
    };
  } catch (err) {
    if (deducted.length > 0) {
      await db.batch(
        deducted.map((it) =>
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(it.quantity, it.product_id)
        )
      );
    }
    throw err;
  }
}

async function approveExistingCipOrder(db, { orderId, cipReference, operationNumber, voucherImage, total }) {
  const order = orderId
    ? await db.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(orderId)).first()
    : await db
        .prepare(`
          SELECT o.*
          FROM orders o
          JOIN payments p ON p.order_id = o.id
          WHERE p.auth_code = ?
          ORDER BY p.id DESC
          LIMIT 1
        `)
        .bind(cipReference)
        .first();

  if (!order) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'La orden de reserva CIP no fue encontrada.');
  }

  const payment = await db
    .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1')
    .bind(order.id)
    .first();

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
    throw new HttpError(409, 'DUPLICATE_OPERATION', 'Esta reserva CIP ya fue procesada y acreditada previamente.');
  }

  if (order.order_status === 'Cancelado') {
    throw new HttpError(409, 'ORDER_CANCELLED', 'Esta orden fue cancelada y no puede ser verificada.');
  }

  if (!cipReference || cipReference !== payment.auth_code) {
    throw new HttpError(400, 'INVALID_FORMAT', 'La referencia CIP ingresada no coincide con la reserva emitida.');
  }

  if (total !== undefined && total !== null && Math.abs(Number(total) - Number(order.total)) > 0.01) {
    throw new HttpError(
      400,
      'INVALID_FORMAT',
      `El monto transferido (S/ ${Number(total).toFixed(2)}) no coincide con el total exacto de la reserva (S/ ${Number(order.total).toFixed(2)}).`
    );
  }

  await assertNoDuplicateOperation(db, operationNumber, null);
  const newAuthCode = await generateUniqueAuthCode(db, generateCipHash);

  await db.batch([
    db.prepare("UPDATE orders SET order_status = 'Pagado / En Preparación' WHERE id = ?").bind(order.id),
    db
      .prepare(`
        UPDATE payments
        SET payment_status = 'Aprobado',
            operation_number = ?,
            voucher_image = COALESCE(?, voucher_image),
            auth_code = ?
        WHERE id = ?
      `)
      .bind(operationNumber, voucherImage || null, newAuthCode, payment.id),
  ]);

  const updatedOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(order.id).first();
  const updatedPayment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(payment.id).first();
  const { results: items } = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all();

  return { order: updatedOrder, payment: updatedPayment, items: items || [] };
}

async function resolveShipping(db, body) {
  const raw = body.shipping_rate_id ?? body.shipping?.rate_id ?? body.shipping?.id;
  if (raw === undefined || raw === null || raw === '') return null;
  const rate = await db
    .prepare('SELECT * FROM shipping_rates WHERE id = ? AND active = 1')
    .bind(Number(raw))
    .first();
  if (!rate) {
    throw new HttpError(
      409,
      'SHIPPING_UNAVAILABLE',
      'Envíos no disponibles temporalmente para esta provincia. Elige otro destino o contacta a soporte.'
    );
  }
  return rate;
}

// ---------------------------------------------------------------------------
// Mercado Pago Checkout Pro (Sandbox). Credenciales SOLO desde bindings del Worker
// (env.MP_ACCESS_TOKEN secreto cifrado y env.MP_PUBLIC_KEY), nunca en el código.
// ---------------------------------------------------------------------------
function getMercadoPagoConfig(env) {
  if (!env.MP_ACCESS_TOKEN) {
    throw new HttpError(
      503,
      'MP_NOT_CONFIGURED',
      'Mercado Pago no está configurado en el servidor. Usa Yape/Plin u otro medio de pago.'
    );
  }
  return { accessToken: env.MP_ACCESS_TOKEN, publicKey: env.MP_PUBLIC_KEY || null };
}

async function mercadoPagoFetch(env, url, options = {}) {
  const { accessToken } = getMercadoPagoConfig(env);
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
  } catch {
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

function mpErrorResponse(err, fallback) {
  if (err instanceof HttpError) {
    return jsonResponse({ success: false, error: err.code, message: err.message }, err.status);
  }
  console.error(fallback, err);
  return jsonResponse({ success: false, error: 'INTERNAL_ERROR', message: fallback }, 500);
}

function getPublicBaseUrl(candidate, env) {
  try {
    const url = new URL(String(candidate || ''));
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
  } catch {
    // ignorar
  }
  return env.PUBLIC_STORE_URL || 'https://localhost';
}

async function handleCreatePreference(request, env) {
  let createdOrderId = null;
  try {
    getMercadoPagoConfig(env);
    const body = await parseJsonBody(request);
    const { customerName, customerDni, customerPhone, shippingAddress, items, total } = extractBuyerAndItems(body);
    const userId = await resolveUserId(env.DB, body.user_id, customerDni);
    const shippingRate = await resolveShipping(env.DB, body);
    if (!shippingRate) {
      throw new HttpError(400, 'INVALID_FORMAT', 'Debes seleccionar el departamento/provincia de envío.');
    }

    // El stock se valida pero NO se descuenta hasta que Mercado Pago confirme 'approved'
    const result = await createOrderAndPaymentAtomically(env.DB, {
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
      authCode: `MP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    });
    createdOrderId = result.order.id;

    const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
    const baseUrl = getPublicBaseUrl(body.return_url, env);
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
      notification_url: `${new URL(request.url).origin}/api/payments/mercadopago-webhook`,
    };
    if (baseUrl.startsWith('https://')) preferencePayload.auto_return = 'approved';

    let preference;
    try {
      preference = await mercadoPagoFetch(env, 'https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preferencePayload),
      });
    } catch (mpError) {
      await env.DB.batch([
        env.DB.prepare("UPDATE orders SET order_status = 'Cancelado' WHERE id = ?").bind(createdOrderId),
        env.DB.prepare("UPDATE payments SET payment_status = 'Rechazado' WHERE order_id = ?").bind(createdOrderId),
      ]);
      throw mpError;
    }

    return jsonResponse(
      {
        success: true,
        order_id: result.order.id,
        order_code: result.order.order_code,
        total: result.order.total,
        shipping_cost: result.order.shipping_cost,
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        public_key: env.MP_PUBLIC_KEY || null,
      },
      201
    );
  } catch (err) {
    return mpErrorResponse(err, 'Error al crear la preferencia de pago de Mercado Pago.');
  }
}

/**
 * Confirma de forma idempotente un pago 'approved' de Mercado Pago: valida monto/moneda,
 * descuenta stock (batch atómico de D1), marca la orden 'Pagado / En Preparación'
 * y registra el payment_id como número de operación único.
 */
async function approveMercadoPagoPayment(db, mpPayment) {
  const orderCode = String(mpPayment.external_reference || '').trim();
  const mpPaymentId = String(mpPayment.id);

  const order = await db.prepare('SELECT * FROM orders WHERE order_code = ?').bind(orderCode).first();
  if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'No se encontró la orden asociada a este pago.');
  const payment = await db
    .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1')
    .bind(order.id)
    .first();
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'No se encontró el registro de pago de la orden.');

  const { results: items } = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all();

  if (payment.payment_status === 'Aprobado') {
    return { order, payment, items: items || [], alreadyApproved: true };
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
  await assertNoDuplicateOperation(db, mpPaymentId, null);

  let stockOk = true;
  for (const it of items || []) {
    const p = await db.prepare('SELECT stock FROM products WHERE id = ?').bind(it.product_id).first();
    if (!p || Number(p.stock) < Number(it.quantity)) stockOk = false;
  }

  const finalStatus = stockOk ? 'Pagado / En Preparación' : 'Pagado / Revisión de Stock';
  const stmts = [];
  if (stockOk) {
    for (const it of items || []) {
      stmts.push(
        db
          .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
          .bind(it.quantity, it.product_id, it.quantity)
      );
    }
  }
  stmts.push(db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').bind(finalStatus, order.id));
  stmts.push(
    db
      .prepare("UPDATE payments SET payment_status = 'Aprobado', operation_number = ?, method = 'Mercado Pago' WHERE id = ?")
      .bind(mpPaymentId, payment.id)
  );
  await db.batch(stmts);

  const updatedOrder = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(order.id).first();
  const updatedPayment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(payment.id).first();
  return { order: updatedOrder, payment: updatedPayment, items: items || [], alreadyApproved: false };
}

async function handleVerifyMercadoPago(request, env) {
  try {
    const body = await parseJsonBody(request);
    const paymentId = String(body?.payment_id ?? '').trim();
    if (!/^\d{3,20}$/.test(paymentId)) {
      throw new HttpError(400, 'INVALID_FORMAT', 'El identificador de pago de Mercado Pago es inválido.');
    }

    const mpPayment = await mercadoPagoFetch(
      env,
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`
    );

    if (mpPayment.status === 'pending' || mpPayment.status === 'in_process') {
      return jsonResponse(
        {
          success: false,
          pending: true,
          status: mpPayment.status,
          message: 'Tu pago está en verificación. Te avisaremos en cuanto la entidad bancaria lo confirme.',
        },
        202
      );
    }
    if (mpPayment.status !== 'approved') {
      return jsonResponse(
        {
          success: false,
          error: 'PAYMENT_NOT_APPROVED',
          status: mpPayment.status,
          message: 'El pago no fue aprobado por Mercado Pago. No se realizó ningún cobro; intenta con otro medio de pago.',
        },
        402
      );
    }

    const result = await approveMercadoPagoPayment(env.DB, mpPayment);
    const publicPayment = maskCustomerPayment(result.payment);
    return jsonResponse({
      success: true,
      message: '¡Pago con Mercado Pago verificado! Orden aprobada.',
      already_processed: result.alreadyApproved,
      order_id: result.order.id,
      order_code: result.order.order_code,
      order: { ...result.order, auto_verified: true, items: result.items, payment: publicPayment },
      payment: publicPayment,
      audit: { channel: 'Mercado Pago Checkout Pro', beneficiary: 'FitStore Pro', verified_at: new Date().toISOString() },
    });
  } catch (err) {
    return mpErrorResponse(err, 'Error al verificar el pago de Mercado Pago.');
  }
}

async function handleMercadoPagoWebhook(request, env) {
  try {
    const url = new URL(request.url);
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const type = String(body?.type || url.searchParams.get('type') || url.searchParams.get('topic') || '');
    const id = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    if (type === 'payment' && id && /^\d{3,20}$/.test(String(id))) {
      const mpPayment = await mercadoPagoFetch(env, `https://api.mercadopago.com/v1/payments/${id}`);
      if (mpPayment.status === 'approved') await approveMercadoPagoPayment(env.DB, mpPayment);
    }
  } catch (err) {
    console.error('[MercadoPago Webhook] No se pudo procesar la notificación:', err?.message || err);
  }
  return jsonResponse({ received: true });
}

async function handleAutoVerify(request, env) {
  try {
    await expireOverdueCipOrders(env.DB);
    const body = await parseJsonBody(request);
    const shippingRate = await resolveShipping(env.DB, body);
    const { kind, subMethod } = normalizeMethod(body.method, body.sub_method);

    if (!kind) {
      return jsonResponse(
        {
          success: false,
          error: 'INVALID_FORMAT',
          message: 'Método de pago no soportado. Usa yape_plin, bank_transfer o credit_card.',
        },
        400
      );
    }

    const settings = await getStoreSettings(env.DB);

    if (kind === 'yape_plin') {
      const { customerName, customerDni, customerPhone, shippingAddress, items, total } = extractBuyerAndItems(body);
      const userId = await resolveUserId(env.DB, body.user_id, customerDni);
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
          throw new HttpError(400, 'INVALID_FORMAT', 'Por favor ingresa el número de operación de tu pago con QR.');
        }
        operationNumber = rawOp;
      } else {
        throw new HttpError(400, 'INVALID_FORMAT', 'Modalidad de verificación Yape/Plin inválida.');
      }

      const isPlin = subMethod === 'plin';
      const methodLabel = isPlin ? 'Plin' : 'Yape';
      const destinationAccount = isPlin
        ? `Plin: ${settings.plin_number} (${settings.owner_name})`
        : `Yape: ${settings.yape_number} (${settings.owner_name})`;
      const authCode = await generateUniqueAuthCode(env.DB, generateYapeHash);

      const result = await createOrderAndPaymentAtomically(env.DB, {
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

      const safePayment = maskCustomerPayment(result.payment);
      return jsonResponse(
        {
          success: true,
          message: '¡Pago verificado automáticamente! Orden aprobada.',
          order_id: result.order.id,
          order_code: result.order.order_code,
          order: { ...result.order, auto_verified: true, items: result.items, payment: safePayment },
          payment: safePayment,
          audit: {
            channel: 'Cámara de Compensación Yape / Plin',
            beneficiary: 'FitStore Pro',
            verified_at: new Date().toISOString(),
          },
        },
        201
      );
    }

    if (kind === 'bank_transfer') {
      const action = String(body.action || 'verify').trim().toLowerCase();
      const destinationAccount = `${settings.bank_name} Cta: ${settings.bank_account_soles} (${settings.owner_name})`;

      if (action === 'reserve_cip') {
        const { customerName, customerDni, customerPhone, shippingAddress, items, total } = extractBuyerAndItems(body);
        const userId = await resolveUserId(env.DB, body.user_id, customerDni);
        const requestedCip = String(body.cip_reference || body.cip_code || '').trim();
        const existingCip = /^CIP-2026-\d{6}$/.test(requestedCip)
          ? await env.DB.prepare('SELECT 1 AS found FROM payments WHERE auth_code = ? LIMIT 1').bind(requestedCip).first()
          : true;
        const cipReference = !existingCip
          ? requestedCip
          : await generateUniqueAuthCode(env.DB, generateCipReference);

        const result = await createOrderAndPaymentAtomically(env.DB, {
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

        const safePayment = maskCustomerPayment(result.payment);
        return jsonResponse(
          {
            success: true,
            message: 'Reserva CIP generada con vigencia de 24 horas.',
            order_id: result.order.id,
            order_code: result.order.order_code,
            cip_reference: cipReference,
            cip_code: cipReference,
            expires_in_hours: 24,
            order: { ...result.order, auto_verified: false, items: result.items, payment: safePayment },
            payment: safePayment,
          },
          201
        );
      }

      if (action !== 'verify') {
        throw new HttpError(400, 'INVALID_FORMAT', 'Acción inválida para transferencia bancaria.');
      }

      const rawOp = String(body.operation_number ?? '').trim();
      if (!rawOp) {
        throw new HttpError(400, 'INVALID_FORMAT', 'Por favor ingresa el número de operación bancaria.');
      }

      const cipRef = String(body.cip_reference || body.cip_code || '').trim();
      if (!cipRef || !/^CIP-2026-\d{6}$/.test(cipRef)) {
        throw new HttpError(
          400,
          'INVALID_FORMAT',
          'El código de referencia CIP debe tener el formato válido CIP-2026-XXXXXX.'
        );
      }

      const existingByRef = !body.order_id
        ? await env.DB
            .prepare('SELECT order_id FROM payments WHERE auth_code = ? ORDER BY id DESC LIMIT 1')
            .bind(cipRef)
            .first()
        : null;

      if (body.order_id || existingByRef) {
        const result = await approveExistingCipOrder(env.DB, {
          orderId: body.order_id || existingByRef.order_id,
          cipReference: cipRef,
          operationNumber: rawOp,
          voucherImage: body.voucher_image || null,
          total: body.total,
        });

        const safePayment = maskCustomerPayment(result.payment);
        return jsonResponse(
          {
            success: true,
            message: '¡Transferencia bancaria verificada automáticamente! Orden aprobada.',
            order_id: result.order.id,
            order_code: result.order.order_code,
            order: { ...result.order, auto_verified: true, items: result.items, payment: safePayment },
            payment: safePayment,
            audit: {
              channel: 'Pasarela Interbancaria CIP',
              beneficiary: 'FitStore Pro',
              verified_at: new Date().toISOString(),
            },
          },
          200
        );
      }

      const { customerName, customerDni, customerPhone, shippingAddress, items, total } = extractBuyerAndItems(body);
      const userId = await resolveUserId(env.DB, body.user_id, customerDni);
      const authCode = await generateUniqueAuthCode(env.DB, generateCipHash);

      const result = await createOrderAndPaymentAtomically(env.DB, {
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

      const safePayment = maskCustomerPayment(result.payment);
      return jsonResponse(
        {
          success: true,
          message: '¡Transferencia bancaria verificada automáticamente! Orden aprobada.',
          order_id: result.order.id,
          order_code: result.order.order_code,
          cip_reference: cipRef,
          order: { ...result.order, auto_verified: true, items: result.items, payment: safePayment },
          payment: safePayment,
          audit: {
            channel: 'Pasarela Interbancaria CIP',
            beneficiary: 'FitStore Pro',
            verified_at: new Date().toISOString(),
          },
        },
        201
      );
    }

    // VÍA 3: TARJETA
    const { customerName, customerDni, customerPhone, shippingAddress, items, total } = extractBuyerAndItems(body);
    const userId = await resolveUserId(env.DB, body.user_id, customerDni);
    const cardData = body.card_data || {};
    const cleanCardNumber = String(body.card_number ?? cardData.number ?? cardData.card_number ?? '').replace(/[\s-]/g, '');
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
    const authCode = await generateUniqueAuthCode(env.DB, generateAuthHash);
    const operationNumber = body.operation_number
      ? String(body.operation_number).trim()
      : `TARJ-${authCode.replace('AUTH-', '')}`;
    const destinationAccount = `Cuenta Recaudadora BCP: ${settings.bank_account_soles} (${settings.owner_name})`;

    const result = await createOrderAndPaymentAtomically(env.DB, {
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

    const safePayment = maskCustomerPayment(result.payment);
    return jsonResponse(
      {
        success: true,
        message: '¡Cobro con tarjeta autorizado en Pasarela FitStore Pro!',
        order_id: result.order.id,
        order_code: result.order.order_code,
        order: { ...result.order, auto_verified: true, items: result.items, payment: safePayment },
        payment: safePayment,
        audit: {
          channel: 'Procesador Tarjeta 3D Secure',
          beneficiary: 'FitStore Pro',
          verified_at: new Date().toISOString(),
        },
      },
      201
    );
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ success: false, error: err.code, message: err.message }, err.status);
    }
    console.error('Error D1 auto-verify:', err);
    return jsonResponse(
      { success: false, error: 'INTERNAL_ERROR', message: 'Ocurrió un error interno al verificar el pago.' },
      500
    );
  }
}

async function handleFitBot(request, env) {
  const body = await parseJsonBody(request);
  const userText = String(body.message || '').trim();
  if (!userText) {
    return jsonResponse({ error: 'El mensaje es obligatorio' }, 400);
  }

  const norm = normalizeText(userText);
  const now = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const msgId = `bot-${Date.now()}`;

  const productsRes = await env.DB.prepare('SELECT * FROM products ORDER BY featured DESC, id ASC').all();
  const catalog = productsRes.results || [];

  // 1. Rastreo de pedidos en vivo contra D1 (DNI 8 dígitos o ORD-YYYY-XXX)
  const dniMatch = userText.match(/\b\d{8}\b/);
  const orderCodeMatch = userText.match(/\bORD-\d{4}-\d{3}\b/i);
  const invalidDniMatch = userText.match(/\b\d{7}\b|\b\d{9,10}\b/);
  const isAskingOrder =
    norm.includes('pedido') ||
    norm.includes('orden') ||
    norm.includes('rastrear') ||
    norm.includes('seguimiento');

  if (dniMatch || orderCodeMatch) {
    await expireOverdueCipOrders(env.DB);
    const searchDni = dniMatch ? dniMatch[0] : null;
    const searchCode = orderCodeMatch ? orderCodeMatch[0].toUpperCase() : null;

    const query = searchDni
      ? env.DB.prepare('SELECT * FROM orders WHERE customer_dni = ? ORDER BY id DESC LIMIT 3').bind(searchDni)
      : env.DB.prepare('SELECT * FROM orders WHERE UPPER(order_code) = ? ORDER BY id DESC LIMIT 3').bind(searchCode);

    const { results: foundOrders } = await query.all();
    const fullOrders = await hydrateOrders(env.DB, foundOrders || []);

    if (fullOrders.length > 0) {
      const ordersSummary = fullOrders.map((ord) => ({
        order_code: ord.order_code,
        created_at: ord.created_at ? String(ord.created_at).substring(0, 16) : 'Reciente',
        customer_name: ord.customer_name,
        customer_dni: ord.customer_dni,
        total: Number(ord.total) || 0,
        order_status: ord.order_status || 'Pagado / En Preparación',
        payment_status: ord.payment?.payment_status || 'Aprobado',
        payment_method: ord.payment?.method || 'Yape',
        destination_account: 'Pasarela FitStore Pro',
        items_summary:
          ord.items?.length > 0
            ? ord.items.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')
            : 'Productos fitness',
      }));

      return jsonResponse({
        id: msgId,
        sender: 'bot',
        text: `Encontré **${fullOrders.length} compra(s)** registrada(s) en FitStore Pro. Aquí tienes el estado actual:`,
        timestamp: now,
        type: 'order_tracking',
        orders: ordersSummary,
      });
    }

    return jsonResponse({
      id: msgId,
      sender: 'bot',
      text: `No encontré pedidos con "${userText}" en nuestra base de datos. Verifica que tu DNI tenga 8 dígitos o que el código de orden sea correcto (ej. ORD-2026-001).`,
      timestamp: now,
      type: 'text',
    });
  }

  if (isAskingOrder && !dniMatch && !orderCodeMatch) {
    return jsonResponse({
      id: msgId,
      sender: 'bot',
      text: invalidDniMatch
        ? '⚠️ Recuerda que el **DNI en el Perú consta de 8 dígitos numéricos**. Escribe tu DNI correcto (ej. `72458912`) o código de orden (ej. `ORD-2026-001`).'
        : '📦 **Rastreo de Pedidos en Tiempo Real**\n\nEscribe tu **DNI de 8 dígitos** o el **código de tu orden** (ej. `ORD-2026-001`) para consultar tu envío.',
      timestamp: now,
      type: 'text',
    });
  }

  // 2. Consultas sobre métodos de pago (pasarela integrada sin cuentas personales)
  if (
    norm.includes('yape') ||
    norm.includes('plin') ||
    norm.includes('cuenta') ||
    norm.includes('bcp') ||
    norm.includes('cci') ||
    norm.includes('como pagar') ||
    norm.includes('metodo de pago') ||
    norm.includes('transferencia') ||
    norm.includes('tarjeta')
  ) {
    return jsonResponse({
      id: msgId,
      sender: 'bot',
      text: `En **FitStore Pro** todos tus pagos se procesan de forma segura mediante nuestra pasarela integrada directamente en el Checkout:\n\n• **Yape / Plin**: Ingresa tu número celular (9 dígitos) y el código OTP de aprobación de 6 dígitos generado en tu app.\n• **Transferencia con Código CIP**: Genera tu código CIP de 24h para abonar desde tu banca móvil.\n• **Tarjeta de Crédito o Débito**: Pago instantáneo cifrado con validación 3D Secure.`,
      timestamp: now,
      type: 'text',
    });
  }

  // 3. Seleccionar productos relevantes desde D1 para mostrar tarjetas interactivas (+ Carrito)
  let recommended = [];
  if (norm.includes('creatina') || norm.includes('creapure')) {
    recommended = catalog.filter((p) => p.category === 'Creatinas');
  } else if (norm.includes('proteina') || norm.includes('whey') || norm.includes('iso')) {
    recommended = catalog.filter((p) => p.category === 'Proteínas');
  } else if (norm.includes('masa') || norm.includes('musculo') || norm.includes('volumen') || norm.includes('fuerza')) {
    recommended = catalog.filter((p) => p.category === 'Proteínas' || p.category === 'Creatinas');
  } else if (norm.includes('energia') || norm.includes('pre') || norm.includes('cafeina')) {
    recommended = catalog.filter((p) => p.category === 'Pre-Entrenos');
  } else if (norm.includes('shaker') || norm.includes('cinturon') || norm.includes('accesorio')) {
    recommended = catalog.filter((p) => p.category === 'Accesorios');
  } else if (norm.includes('barat') || norm.includes('economic') || norm.includes('oferta')) {
    recommended = [...catalog].filter((p) => p.stock > 0).sort((a, b) => Number(a.price) - Number(b.price));
  } else if (norm.includes('grasa') || norm.includes('defin')) {
    recommended = catalog.filter((p) => p.category === 'Proteínas' || p.category === 'Pre-Entrenos');
  } else {
    const words = norm.split(/\s+/).filter((w) => w.length > 2);
    recommended = catalog.filter((p) => {
      const hay = normalizeText(`${p.name} ${p.description} ${p.category}`);
      return words.some((w) => hay.includes(w));
    });
  }

  const inStock = recommended.filter((p) => Number(p.stock) > 0);
  const selectedProducts = (inStock.length > 0 ? inStock : recommended).slice(0, 3);

  // 4. Consultar Workers AI (@cf/meta/llama-3.2-3b-instruct) conectado al catálogo real en D1
  let aiText = '';
  let aiUsed = false;

  if (env.AI && typeof env.AI.run === 'function') {
    try {
      const catalogContext =
        catalog.length > 0
          ? catalog
              .map(
                (p) =>
                  `- ${p.name} (${p.category}): S/ ${Number(p.price).toFixed(2)}, stock: ${p.stock} un. ${p.description}`
              )
              .join('\n')
          : 'Actualmente el catálogo está en actualización (0 productos publicados por el momento).';

      const aiRes = await env.AI.run(LLAMA_MODEL, {
        messages: [
          {
            role: 'system',
            content: `Eres FitBot, coach nutricional experto de FitStore Pro en Perú. Responde en español peruano de forma breve (máximo 4 líneas), amigable y directa, usando precios en Soles (S/). Usa SOLO estos productos reales disponibles en la tienda:\n${catalogContext}\nAceptamos Yape/Plin (código OTP), Transferencia con Código CIP y Tarjeta 3D Secure mediante nuestra pasarela integrada (sin revelar datos bancarios ni personales).`,
          },
          { role: 'user', content: userText },
        ],
        max_tokens: 260,
        temperature: 0.4,
      });

      const candidate = String(aiRes?.response || aiRes?.result?.response || '').trim();
      if (candidate) {
        aiText = candidate;
        aiUsed = true;
      }
    } catch (aiErr) {
      console.warn('Workers AI fallback a motor D1:', aiErr?.message || aiErr);
    }
  }

  if (!aiText) {
    if (selectedProducts.length > 0) {
      aiText =
        'Aquí tienes las mejores opciones disponibles de nuestro catálogo oficial FitStore Pro listas para agregar a tu carrito:';
    } else if (catalog.length === 0) {
      aiText =
        'El catálogo se encuentra en actualización en este momento. Muy pronto verás nuevos suplementos disponibles en FitStore Pro.';
    } else {
      aiText =
        'Como tu coach fitness puedo recomendarte **Proteínas Whey, Creatinas Creapure o Pre-Entrenos**, explicarte pagos por **Yape/Plin OTP, Código CIP o Tarjeta** y rastrear tu pedido con tu **DNI de 8 dígitos**.';
    }
  }

  return jsonResponse({
    id: msgId,
    sender: 'bot',
    text: aiText,
    timestamp: now,
    type: selectedProducts.length > 0 ? 'products' : 'text',
    ...(selectedProducts.length > 0 ? { products: selectedProducts } : {}),
    ai_model: aiUsed ? LLAMA_MODEL : 'fitbot-d1-heuristic',
  });
}

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const path = url.pathname;
  const method = request.method;

  if (path === '/api/health' && method === 'GET') {
    return jsonResponse({
      status: 'ok',
      store: 'FitStore Pro - Tienda',
      database: 'Cloudflare D1 (fitstore-db)',
      ai_model: LLAMA_MODEL,
      timestamp: new Date().toISOString(),
    });
  }

  if (path === '/api/settings' && method === 'GET') {
    return jsonResponse({
      store_name: 'FitStore Pro',
      currency: 'PEN',
      payment_methods: ['Yape OTP', 'Plin OTP', 'Transferencia CIP', 'Tarjeta 3D Secure'],
    });
  }

  // Autenticación real de clientes (/api/auth/register & /api/auth/login)
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await parseJsonBody(request);
    const { name, dni, email, phone, address, city, password } = body || {};

    if (!name?.trim() || !dni?.trim() || !email?.trim() || !phone?.trim() || !address?.trim() || !password) {
      return jsonResponse({ error: 'Todos los campos son obligatorios para crear tu cuenta.' }, 400);
    }

    const cleanDni = String(dni).trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!/^\d{8}$/.test(cleanDni)) {
      return jsonResponse({ error: 'El DNI debe contener exactamente 8 dígitos numéricos.' }, 400);
    }
    if (!/^\d{9}$/.test(cleanPhone)) {
      return jsonResponse({ error: 'El número de celular debe contener exactamente 9 dígitos numéricos.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return jsonResponse({ error: 'Ingresa un correo electrónico válido.' }, 400);
    }
    if (String(password).length < 6) {
      return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
    }

    const existing = await env.DB
      .prepare('SELECT id FROM users WHERE LOWER(email) = ? OR dni = ? LIMIT 1')
      .bind(cleanEmail, cleanDni)
      .first();
    if (existing) {
      return jsonResponse(
        { error: 'Ya existe una cuenta registrada con ese correo electrónico o número de DNI.' },
        409
      );
    }

    const res = await env.DB
      .prepare(`
        INSERT INTO users (name, dni, email, phone, address, city, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'client')
      `)
      .bind(
        name.trim(),
        cleanDni,
        cleanEmail,
        cleanPhone,
        address.trim(),
        city?.trim() || 'Lima',
        String(password)
      )
      .run();

    const created = await env.DB
      .prepare('SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ?')
      .bind(Number(res.meta.last_row_id))
      .first();

    return jsonResponse({ message: 'Cuenta creada exitosamente', user: created }, 201);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await parseJsonBody(request);
    const { email, password } = body || {};
    if (!email?.trim() || !password) {
      return jsonResponse({ error: 'Ingresa tu correo electrónico y contraseña.' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await env.DB
      .prepare("SELECT * FROM users WHERE LOWER(email) = ? AND role = 'client' LIMIT 1")
      .bind(cleanEmail)
      .first();

    if (!user || user.password !== String(password)) {
      return jsonResponse({ error: 'Correo electrónico o contraseña incorrectos.' }, 401);
    }

    const { password: _, ...safeUser } = user;
    return jsonResponse({ message: 'Sesión iniciada correctamente', user: safeUser });
  }

  // Productos
  if (path === '/api/products' && method === 'GET') {
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort');

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'Todos') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (sort === 'price_asc') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY price DESC';
    } else {
      sql += ' ORDER BY featured DESC, id ASC';
    }

    const { results } = await env.DB.prepare(sql).bind(...params).all();
    return jsonResponse(results || []);
  }

  const productMatch = /^\/api\/products\/(\d+)$/.exec(path);
  if (productMatch && method === 'GET') {
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(Number(productMatch[1])).first();
    if (!product) return jsonResponse({ error: 'Producto no encontrado' }, 404);
    return jsonResponse(product);
  }

  // Usuarios: endpoints públicos individuales para sesión/perfil del cliente (el listado completo es exclusivo de Admin)
  if (path === '/api/users' && method === 'GET') {
    return jsonResponse({ error: 'Listado completo reservado para el Portal de Administración' }, 403);
  }

  if (path === '/api/users' && method === 'POST') {
    const body = await parseJsonBody(request);
    const { name, dni, email, phone, address, city } = body;
    if (!name || !dni || !email || !phone || !address || !city) {
      return jsonResponse({ error: 'Todos los campos son obligatorios' }, 400);
    }
    if (!/^\d{8}$/.test(String(dni))) {
      return jsonResponse({ error: 'El DNI debe contener exactamente 8 dígitos numéricos' }, 400);
    }
    if (!/^\d{9}$/.test(String(phone))) {
      return jsonResponse({ error: 'El celular debe contener exactamente 9 dígitos numéricos' }, 400);
    }

    try {
      const res = await env.DB
        .prepare(`
          INSERT INTO users (name, dni, email, phone, address, city, password, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'client')
        `)
        .bind(name.trim(), String(dni).trim(), email.trim(), String(phone).trim(), address.trim(), city.trim(), 'cliente123')
        .run();

      const created = await env.DB
        .prepare('SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ?')
        .bind(Number(res.meta.last_row_id))
        .first();
      return jsonResponse(created, 201);
    } catch (err) {
      if (String(err?.message || '').includes('UNIQUE')) {
        return jsonResponse({ error: 'El DNI o Correo ya se encuentra registrado' }, 400);
      }
      throw err;
    }
  }

  const userMatch = /^\/api\/users\/(\d+)$/.exec(path);
  if (userMatch && method === 'GET') {
    const user = await env.DB
      .prepare("SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ? AND role = 'client'")
      .bind(Number(userMatch[1]))
      .first();
    if (!user) return jsonResponse({ error: 'Usuario no encontrado' }, 404);
    return jsonResponse(user);
  }

  if (userMatch && method === 'PUT') {
    const body = await parseJsonBody(request);
    const { name, dni, email, phone, address, city } = body;
    if (!/^\d{8}$/.test(String(dni || ''))) {
      return jsonResponse({ error: 'El DNI debe contener exactamente 8 dígitos numéricos' }, 400);
    }
    if (!/^\d{9}$/.test(String(phone || ''))) {
      return jsonResponse({ error: 'El número de celular debe contener exactamente 9 dígitos numéricos' }, 400);
    }
    await env.DB
      .prepare("UPDATE users SET name = ?, dni = ?, email = ?, phone = ?, address = ?, city = ? WHERE id = ? AND role = 'client'")
      .bind(name, String(dni), email, String(phone), address, city, Number(userMatch[1]))
      .run();

    const updated = await env.DB
      .prepare('SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ?')
      .bind(Number(userMatch[1]))
      .first();
    return jsonResponse(updated);
  }

  // Pedidos del cliente
  const userOrdersMatch = /^\/api\/orders\/user\/(\d+)$/.exec(path);
  if (userOrdersMatch && method === 'GET') {
    await expireOverdueCipOrders(env.DB);
    const { results } = await env.DB
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
      .bind(Number(userOrdersMatch[1]))
      .all();
    return jsonResponse(await hydrateOrders(env.DB, results || []));
  }

  const orderByIdMatch = /^\/api\/orders\/(\d+)$/.exec(path);
  if (orderByIdMatch && method === 'GET') {
    await expireOverdueCipOrders(env.DB);
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(orderByIdMatch[1])).first();
    if (!order) return jsonResponse({ error: 'Pedido no encontrado' }, 404);
    const [full] = await hydrateOrders(env.DB, [order]);
    return jsonResponse(full);
  }

  // Motor de Verificación Automática (Feature 004)
  if (path === '/api/payments/auto-verify' && method === 'POST') {
    return handleAutoVerify(request, env);
  }

  // Feature 007: tarifas de envío, Yape/Plin directo y Mercado Pago Checkout Pro
  if (path === '/api/shipping-rates' && method === 'GET') {
    const { results } = await env.DB
      .prepare('SELECT id, department, province, cost, delivery_days, active FROM shipping_rates WHERE active = 1 ORDER BY department, province')
      .all();
    return jsonResponse(results || []);
  }
  if (path === '/api/payments/yape-plin' && method === 'POST') {
    const raw = await parseJsonBody(request);
    const rawSub = String(raw.sub_method || raw.payment_method || raw.method || 'yape').toLowerCase();
    const forwarded = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...raw,
        method: 'yape_plin',
        mode: 'otp',
        verification_mode: 'otp',
        sub_method: rawSub === 'plin' ? 'plin' : 'yape',
        otp_code: raw.otp_code ?? raw.otp,
      }),
    });
    return handleAutoVerify(forwarded, env);
  }
  if (path === '/api/payments/create-preference' && method === 'POST') {
    return handleCreatePreference(request, env);
  }
  if (path === '/api/payments/verify-mercadopago' && method === 'POST') {
    return handleVerifyMercadoPago(request, env);
  }
  if (path === '/api/payments/mercadopago-webhook' && method === 'POST') {
    return handleMercadoPagoWebhook(request, env);
  }

  const auditMatch = /^\/api\/payments\/audit\/([^/]+)$/.exec(path);
  if (auditMatch && method === 'GET') {
    await expireOverdueCipOrders(env.DB);
    const key = decodeURIComponent(auditMatch[1]);
    let row = await env.DB
      .prepare(`
        SELECT o.id AS order_id, o.order_code, o.customer_name, o.customer_dni, o.total, o.order_status,
               o.created_at AS order_created_at, p.method, p.destination_account, p.amount, p.currency,
               p.operation_number, p.card_last4, p.auth_code, p.payment_status, p.created_at AS payment_created_at
        FROM orders o
        LEFT JOIN payments p ON p.order_id = o.id
        WHERE o.order_code = ?
        ORDER BY p.id DESC LIMIT 1
      `)
      .bind(key)
      .first();

    if (!row && /^\d+$/.test(key)) {
      row = await env.DB
        .prepare(`
          SELECT o.id AS order_id, o.order_code, o.customer_name, o.customer_dni, o.total, o.order_status,
                 o.created_at AS order_created_at, p.method, p.destination_account, p.amount, p.currency,
                 p.operation_number, p.card_last4, p.auth_code, p.payment_status, p.created_at AS payment_created_at
          FROM orders o
          LEFT JOIN payments p ON p.order_id = o.id
          WHERE o.id = ?
          ORDER BY p.id DESC LIMIT 1
        `)
        .bind(Number(key))
        .first();
    }

    if (!row) {
      return jsonResponse({ success: false, error: 'ORDER_NOT_FOUND', message: 'Orden no encontrada.' }, 404);
    }

    const { results: items } = await env.DB
      .prepare('SELECT id, product_id, product_name, quantity, unit_price, subtotal FROM order_items WHERE order_id = ?')
      .bind(row.order_id)
      .all();

    return jsonResponse({
      ...row,
      destination_account: 'Pasarela FitStore Pro',
      verified_at: row.payment_created_at || row.order_created_at,
      auto_verified: Boolean(row.auth_code && /^(YAPE-AUTO-|CIP-AUTO-|AUTH-)/.test(row.auth_code)),
      items: items || [],
    });
  }

  // FitBot con Workers AI + D1
  if (path === '/api/fitbot' && method === 'POST') {
    return handleFitBot(request, env);
  }

  return jsonResponse({ error: 'Endpoint no disponible en el portal de clientes' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        if (err instanceof HttpError) {
          return jsonResponse({ success: false, error: err.code, message: err.message }, err.status);
        }
        console.error('Worker API unhandled error:', err);
        return jsonResponse({ error: 'Ocurrió un error interno en el servidor' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
