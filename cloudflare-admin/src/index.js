const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_CATEGORIES = ['Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'];
const VALID_ORDER_STATUSES = [
  'Pendiente de Pago',
  'En Verificación',
  'Pagado / En Preparación',
  'Pagado / Revisión de Stock',
  'Enviado',
  'Entregado',
  'Cancelado',
  'Expirado',
];
const VALID_PAYMENT_STATUSES = ['Aprobado', 'Rechazado', 'Pendiente de Verificación'];

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
    return null;
  }
}

async function getStoreSettings(db) {
  const row = await db.prepare('SELECT * FROM store_settings WHERE id = 1').first();
  return (
    row || {
      id: 1,
      owner_name: 'Jeancarlos José Huertas Quichca',
      yape_number: '924046690',
      plin_number: '983064501',
      bank_name: 'BCP - Banco de Crédito del Perú',
      bank_account_soles: '22079349234041',
      bank_cci: '00222017934923404128',
      whatsapp_notification: '983064501',
    }
  );
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
        payment: payment || null,
      };
    })
  );
}

async function handleSettings(request, env, method) {
  if (method === 'GET') {
    return jsonResponse(await getStoreSettings(env.DB));
  }
  if (method === 'PUT') {
    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'JSON inválido' }, 400);

    const {
      owner_name,
      yape_number,
      plin_number,
      bank_name,
      bank_account_soles,
      bank_cci,
      whatsapp_notification,
    } = body;

    if (!owner_name || !owner_name.trim()) {
      return jsonResponse({ error: 'El nombre del titular es obligatorio' }, 400);
    }
    if (yape_number && !/^\d{9}$/.test(String(yape_number))) {
      return jsonResponse({ error: 'El número de Yape debe contener exactamente 9 dígitos numéricos' }, 400);
    }
    if (plin_number && !/^\d{9}$/.test(String(plin_number))) {
      return jsonResponse({ error: 'El número de Plin debe contener exactamente 9 dígitos numéricos' }, 400);
    }
    if (whatsapp_notification && !/^\d{9}$/.test(String(whatsapp_notification))) {
      return jsonResponse({ error: 'El número de WhatsApp debe contener exactamente 9 dígitos numéricos' }, 400);
    }

    await env.DB
      .prepare(`
        UPDATE store_settings
        SET owner_name = ?, yape_number = ?, plin_number = ?, bank_name = ?,
            bank_account_soles = ?, bank_cci = ?, whatsapp_notification = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `)
      .bind(
        owner_name.trim(),
        yape_number ? String(yape_number).trim() : '',
        plin_number ? String(plin_number).trim() : '',
        bank_name ? bank_name.trim() : 'BCP - Banco de Crédito del Perú',
        bank_account_soles ? String(bank_account_soles).trim() : '',
        bank_cci ? String(bank_cci).trim() : '',
        whatsapp_notification ? String(whatsapp_notification).trim() : ''
      )
      .run();

    const updated = await getStoreSettings(env.DB);
    return jsonResponse({ ...updated, message: 'Configuración de cuentas actualizada correctamente' });
  }
  return jsonResponse({ error: 'Método no permitido' }, 405);
}

async function handleProducts(request, env, url, path, method) {
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

    if (sort === 'price_asc') sql += ' ORDER BY price ASC';
    else if (sort === 'price_desc') sql += ' ORDER BY price DESC';
    else sql += ' ORDER BY featured DESC, id ASC';

    const { results } = await env.DB.prepare(sql).bind(...params).all();
    return jsonResponse(results || []);
  }

  if (path === '/api/products' && method === 'POST') {
    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'JSON inválido' }, 400);

    const { name, description, category, price, stock, image_url, featured } = body;
    if (!name || !name.trim()) {
      return jsonResponse({ error: 'El nombre del producto es obligatorio' }, 400);
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return jsonResponse({ error: `Categoría inválida. Debe ser una de: ${VALID_CATEGORIES.join(', ')}` }, 400);
    }
    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      return jsonResponse({ error: 'El precio debe ser un número mayor a cero en Soles (S/)' }, 400);
    }
    const numStock = Number(stock);
    if (Number.isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      return jsonResponse({ error: 'El stock debe ser un número entero mayor o igual a 0' }, 400);
    }

    const finalImage =
      image_url && image_url.trim()
        ? image_url.trim()
        : 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800';

    const res = await env.DB
      .prepare(`
        INSERT INTO products (name, description, category, price, stock, image_url, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        name.trim(),
        description ? description.trim() : 'Suplemento fitness oficial de alta calidad.',
        category,
        numPrice,
        numStock,
        finalImage,
        featured ? 1 : 0
      )
      .run();

    const created = await env.DB
      .prepare('SELECT * FROM products WHERE id = ?')
      .bind(Number(res.meta.last_row_id))
      .first();
    return jsonResponse(created, 201);
  }

  const prodMatch = /^\/api\/products\/(\d+)$/.exec(path);
  if (!prodMatch) return null;
  const id = Number(prodMatch[1]);

  if (method === 'GET') {
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    if (!product) return jsonResponse({ error: 'Producto no encontrado' }, 404);
    return jsonResponse(product);
  }

  if (method === 'PUT') {
    const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    if (!existing) return jsonResponse({ error: 'Producto no encontrado' }, 404);

    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'JSON inválido' }, 400);

    const { name, description, category, price, stock, image_url, featured } = body;
    const finalCategory = category || existing.category;
    if (!VALID_CATEGORIES.includes(finalCategory)) {
      return jsonResponse({ error: `Categoría inválida. Debe ser una de: ${VALID_CATEGORIES.join(', ')}` }, 400);
    }
    const finalPrice = price !== undefined ? Number(price) : existing.price;
    if (Number.isNaN(finalPrice) || finalPrice <= 0) {
      return jsonResponse({ error: 'El precio debe ser un número mayor a cero en Soles (S/)' }, 400);
    }
    const finalStock = stock !== undefined ? Number(stock) : existing.stock;
    if (Number.isNaN(finalStock) || finalStock < 0 || !Number.isInteger(finalStock)) {
      return jsonResponse({ error: 'El stock debe ser un número entero mayor o igual a 0' }, 400);
    }

    await env.DB
      .prepare(`
        UPDATE products
        SET name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ?, featured = ?
        WHERE id = ?
      `)
      .bind(
        name !== undefined ? name.trim() : existing.name,
        description !== undefined ? description.trim() : existing.description,
        finalCategory,
        finalPrice,
        finalStock,
        image_url !== undefined && image_url.trim() ? image_url.trim() : existing.image_url,
        featured !== undefined ? (featured ? 1 : 0) : existing.featured,
        id
      )
      .run();

    const updated = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    return jsonResponse({ ...updated, message: 'Producto actualizado correctamente' });
  }

  if (method === 'DELETE') {
    const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    if (!existing) return jsonResponse({ error: 'Producto no encontrado' }, 404);

    try {
      await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
      return jsonResponse({ message: 'Producto eliminado exitosamente del catálogo activo', id });
    } catch (err) {
      if (String(err?.message || '').includes('FOREIGN KEY')) {
        return jsonResponse(
          {
            error:
              'Este producto tiene pedidos históricos registrados. Edita su stock a 0 para marcarlo como agotado sin afectar el historial.',
          },
          409
        );
      }
      throw err;
    }
  }

  return null;
}

async function handleUsers(request, env, path, method) {
  if (path === '/api/users' && method === 'GET') {
    const { results } = await env.DB
      .prepare(`
        SELECT
          u.id, u.name, u.dni, u.email, u.phone, u.address, u.city, u.role, u.created_at,
          COUNT(o.id) AS orders_count,
          ROUND(COALESCE(SUM(CASE WHEN o.order_status NOT IN ('Cancelado', 'Expirado') THEN o.total ELSE 0 END), 0), 2) AS total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id
        ORDER BY u.id ASC
      `)
      .all();
    return jsonResponse(results || []);
  }

  if (path === '/api/users' && method === 'POST') {
    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'JSON inválido' }, 400);

    const { name, dni, email, phone, address, city, role } = body;
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
          VALUES (?, ?, ?, ?, ?, ?, 'cliente123', ?)
        `)
        .bind(name.trim(), String(dni).trim(), email.trim(), String(phone).trim(), address.trim(), city.trim(), role === 'admin' ? 'admin' : 'client')
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
  if (!userMatch) return null;
  const id = Number(userMatch[1]);

  if (method === 'GET') {
    const user = await env.DB
      .prepare('SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ?')
      .bind(id)
      .first();
    if (!user) return jsonResponse({ error: 'Usuario no encontrado' }, 404);
    return jsonResponse(user);
  }

  if (method === 'PUT') {
    const body = await parseJsonBody(request);
    if (!body) return jsonResponse({ error: 'JSON inválido' }, 400);

    const { name, dni, email, phone, address, city } = body;
    if (!/^\d{8}$/.test(String(dni || ''))) {
      return jsonResponse({ error: 'El DNI debe contener exactamente 8 dígitos numéricos' }, 400);
    }
    if (!/^\d{9}$/.test(String(phone || ''))) {
      return jsonResponse({ error: 'El número de celular debe contener exactamente 9 dígitos numéricos' }, 400);
    }

    await env.DB
      .prepare('UPDATE users SET name = ?, dni = ?, email = ?, phone = ?, address = ?, city = ? WHERE id = ?')
      .bind(name, String(dni), email, String(phone), address, city, id)
      .run();

    const updated = await env.DB
      .prepare('SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ?')
      .bind(id)
      .first();
    return jsonResponse(updated);
  }

  return null;
}

async function handleOrders(request, env, path, method) {
  const userOrdersMatch = /^\/api\/orders\/user\/(\d+)$/.exec(path);
  if (userOrdersMatch && method === 'GET') {
    await expireOverdueCipOrders(env.DB);
    const { results } = await env.DB
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
      .bind(Number(userOrdersMatch[1]))
      .all();
    return jsonResponse(await hydrateOrders(env.DB, results || []));
  }

  if (path === '/api/orders' && method === 'GET') {
    await expireOverdueCipOrders(env.DB);
    const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    return jsonResponse(await hydrateOrders(env.DB, results || []));
  }

  const orderMatch = /^\/api\/orders\/(\d+)$/.exec(path);
  if (orderMatch && method === 'GET') {
    await expireOverdueCipOrders(env.DB);
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(orderMatch[1])).first();
    if (!order) return jsonResponse({ error: 'Pedido no encontrado' }, 404);
    const [full] = await hydrateOrders(env.DB, [order]);
    return jsonResponse(full);
  }

  const payMatch = /^\/api\/orders\/(\d+)\/payment$/.exec(path);
  if (payMatch && method === 'PUT') {
    const id = Number(payMatch[1]);
    const body = await parseJsonBody(request);
    const paymentStatus = body?.payment_status;

    if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return jsonResponse({ error: `Estado de pago inválido. Debe ser: ${VALID_PAYMENT_STATUSES.join(', ')}` }, 400);
    }

    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!order) return jsonResponse({ error: 'Pedido no encontrado' }, 404);

    let newOrderStatus = order.order_status;
    let stockRestored = false;
    const stmts = [];

    if (paymentStatus === 'Aprobado') {
      newOrderStatus = 'Pagado / En Preparación';
    } else if (paymentStatus === 'Rechazado') {
      newOrderStatus = 'Cancelado';
      if (order.order_status !== 'Cancelado' && order.order_status !== 'Expirado') {
        const mpPendingPay = await env.DB
          .prepare("SELECT 1 AS found FROM payments WHERE order_id = ? AND payment_status = 'Pendiente (Mercado Pago)' LIMIT 1")
          .bind(id)
          .first();
        const { results: items } =
          mpPendingPay || order.order_status === 'Pagado / Revisión de Stock'
            ? { results: [] }
            : await env.DB
                .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
                .bind(id)
                .all();
        for (const it of items || []) {
          if (it.product_id) {
            stmts.push(
              env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(it.quantity, it.product_id)
            );
          }
        }
        stockRestored = true;
      }
    }

    stmts.push(env.DB.prepare('UPDATE orders SET order_status = ? WHERE id = ?').bind(newOrderStatus, id));
    stmts.push(env.DB.prepare('UPDATE payments SET payment_status = ? WHERE order_id = ?').bind(paymentStatus, id));
    await env.DB.batch(stmts);

    return jsonResponse({
      message: 'Estado de pago actualizado correctamente',
      order_id: id,
      order_status: newOrderStatus,
      payment_status: paymentStatus,
      stock_restored: stockRestored,
    });
  }

  const statusMatch = /^\/api\/orders\/(\d+)\/status$/.exec(path);
  if (statusMatch && method === 'PUT') {
    const id = Number(statusMatch[1]);
    const body = await parseJsonBody(request);
    const orderStatus = body?.order_status;

    if (!orderStatus || !VALID_ORDER_STATUSES.includes(orderStatus)) {
      return jsonResponse(
        { error: `Estado de pedido inválido. Debe ser uno de: ${VALID_ORDER_STATUSES.join(', ')}` },
        400
      );
    }

    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!order) return jsonResponse({ error: 'Pedido no encontrado' }, 404);

    await env.DB.prepare('UPDATE orders SET order_status = ? WHERE id = ?').bind(orderStatus, id).run();
    return jsonResponse({
      message: `Estado del pedido actualizado a ${orderStatus}`,
      order_id: id,
      order_status: orderStatus,
    });
  }

  const cancelMatch = /^\/api\/orders\/(\d+)\/cancel$/.exec(path);
  if (cancelMatch && method === 'POST') {
    await expireOverdueCipOrders(env.DB);
    const id = Number(cancelMatch[1]);
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!order) {
      return jsonResponse({ success: false, error: 'Pedido no encontrado' }, 404);
    }
    if (order.order_status === 'Cancelado' || order.order_status === 'Expirado') {
      return jsonResponse(
        {
          success: false,
          error: `El pedido ya se encuentra en estado ${order.order_status} y no puede cancelarse nuevamente`,
        },
        409
      );
    }

    const { results: items } = await env.DB
      .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
      .bind(id)
      .all();

    // Pedidos de Mercado Pago aún no pagados (o pagados sin stock) nunca descontaron inventario
    const mpPending = await env.DB
      .prepare("SELECT 1 AS found FROM payments WHERE order_id = ? AND payment_status = 'Pendiente (Mercado Pago)' LIMIT 1")
      .bind(id)
      .first();
    const stockWasDeducted = !mpPending && order.order_status !== 'Pagado / Revisión de Stock';

    const stmts = [
      env.DB.prepare("UPDATE orders SET order_status = 'Cancelado' WHERE id = ?").bind(id),
      env.DB.prepare("UPDATE payments SET payment_status = 'Rechazado' WHERE order_id = ?").bind(id),
    ];

    for (const it of stockWasDeducted ? items || [] : []) {
      if (it.product_id) {
        stmts.push(
          env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(it.quantity, it.product_id)
        );
      }
    }

    await env.DB.batch(stmts);
    return jsonResponse({
      success: true,
      message: 'Orden cancelada exitosamente y stock de productos reintegrado al inventario.',
      order_id: id,
      order_code: order.order_code,
      order_status: 'Cancelado',
      payment_status: 'Rechazado',
      stock_restored: true,
    });
  }

  return null;
}

async function handleAudit(env, path, method) {
  const auditMatch = /^\/api\/payments\/audit\/([^/]+)$/.exec(path);
  if (!auditMatch || method !== 'GET') return null;

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

  const authCode = row.auth_code || null;
  let channel = 'Verificación Estándar';
  if (authCode?.startsWith('YAPE-AUTO-')) channel = 'Cámara de Compensación Yape / Plin';
  else if (authCode?.startsWith('CIP-AUTO-') || authCode?.startsWith('CIP-2026-')) channel = 'Canal Interbancario BCP / CCI';
  else if (authCode?.startsWith('AUTH-')) channel = 'Procesador Tarjeta 3D Secure';

  return jsonResponse({
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
    auto_verified: Boolean(authCode && /^(YAPE-AUTO-|CIP-AUTO-|AUTH-)/.test(authCode)),
    channel,
    items: items || [],
  });
}

async function handleShippingRates(request, env, path, method) {
  const parseRate = (body, existing = null) => {
    const department = String(body?.department ?? existing?.department ?? '').trim();
    const province = String(body?.province ?? existing?.province ?? '').trim();
    const costRaw = body?.cost ?? existing?.cost;
    const cost = Number(costRaw);
    const deliveryDays = String(body?.delivery_days ?? existing?.delivery_days ?? '').trim() || 'A coordinar';
    const active =
      body?.active !== undefined
        ? body.active === true || body.active === 1 || body.active === '1'
          ? 1
          : 0
        : existing
          ? Number(existing.active)
          : 1;
    if (!department) return { error: 'El departamento es obligatorio.' };
    if (!province) return { error: 'La provincia es obligatoria.' };
    if (costRaw === '' || costRaw === null || costRaw === undefined || !Number.isFinite(cost) || cost < 0) {
      return { error: 'El costo de envío debe ser un monto en Soles mayor o igual a cero.' };
    }
    return { value: { department, province, cost: Number(cost.toFixed(2)), delivery_days: deliveryDays, active } };
  };

  if (path === '/api/shipping-rates' && method === 'GET') {
    const { results } = await env.DB
      .prepare('SELECT id, department, province, cost, delivery_days, active FROM shipping_rates WHERE active = 1 ORDER BY department, province')
      .all();
    return jsonResponse(results || []);
  }

  if (path === '/api/admin/shipping-rates' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM shipping_rates ORDER BY department, province').all();
    return jsonResponse(results || []);
  }

  if (path === '/api/admin/shipping-rates' && method === 'POST') {
    const { value, error } = parseRate(await parseJsonBody(request));
    if (error) return jsonResponse({ success: false, error: 'INVALID_FORMAT', message: error }, 400);
    const res = await env.DB
      .prepare('INSERT INTO shipping_rates (department, province, cost, delivery_days, active) VALUES (?, ?, ?, ?, ?)')
      .bind(value.department, value.province, value.cost, value.delivery_days, value.active)
      .run();
    const created = await env.DB
      .prepare('SELECT * FROM shipping_rates WHERE id = ?')
      .bind(Number(res.meta.last_row_id))
      .first();
    return jsonResponse(
      { success: true, id: created.id, rate: created, message: 'Tarifa de envío registrada exitosamente' },
      201
    );
  }

  const rateMatch = /^\/api\/admin\/shipping-rates\/(\d+)$/.exec(path);
  if (rateMatch && method === 'PUT') {
    const id = Number(rateMatch[1]);
    const existing = await env.DB.prepare('SELECT * FROM shipping_rates WHERE id = ?').bind(id).first();
    if (!existing) return jsonResponse({ success: false, error: 'NOT_FOUND', message: 'Tarifa no encontrada.' }, 404);
    const { value, error } = parseRate(await parseJsonBody(request), existing);
    if (error) return jsonResponse({ success: false, error: 'INVALID_FORMAT', message: error }, 400);
    await env.DB
      .prepare('UPDATE shipping_rates SET department = ?, province = ?, cost = ?, delivery_days = ?, active = ? WHERE id = ?')
      .bind(value.department, value.province, value.cost, value.delivery_days, value.active, id)
      .run();
    const updated = await env.DB.prepare('SELECT * FROM shipping_rates WHERE id = ?').bind(id).first();
    return jsonResponse({ success: true, rate: updated, message: 'Tarifa de envío actualizada exitosamente' });
  }

  if (rateMatch && method === 'DELETE') {
    const res = await env.DB.prepare('DELETE FROM shipping_rates WHERE id = ?').bind(Number(rateMatch[1])).run();
    if (!res?.meta?.changes) {
      return jsonResponse({ success: false, error: 'NOT_FOUND', message: 'Tarifa no encontrada.' }, 404);
    }
    return jsonResponse({ success: true, message: 'Tarifa de envío eliminada' });
  }

  return null;
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
      store: 'FitStore Pro - Admin',
      database: 'Cloudflare D1 (fitstore-db)',
      timestamp: new Date().toISOString(),
    });
  }

  if (path === '/api/settings') return handleSettings(request, env, method);

  const prodRes = await handleProducts(request, env, url, path, method);
  if (prodRes) return prodRes;

  const userRes = await handleUsers(request, env, path, method);
  if (userRes) return userRes;

  const orderRes = await handleOrders(request, env, path, method);
  if (orderRes) return orderRes;

  const auditRes = await handleAudit(env, path, method);
  if (auditRes) return auditRes;

  const shippingRes = await handleShippingRates(request, env, path, method);
  if (shippingRes) return shippingRes;

  return jsonResponse({ error: 'Endpoint no encontrado en el Panel Administrativo' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        console.error('Worker Admin API error:', err);
        return jsonResponse({ error: 'Ocurrió un error interno en el servidor administrativo' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
