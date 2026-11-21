import db from './database.js';

export function initializeDatabase() {
  // 1. Crear 6 tablas relacionales e índices de verificación
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      owner_name TEXT NOT NULL,
      yape_number TEXT NOT NULL,
      plin_number TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      bank_account_soles TEXT NOT NULL,
      bank_cci TEXT NOT NULL,
      whatsapp_notification TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dni TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('client', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios')),
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL,
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_dni TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      total REAL NOT NULL,
      order_status TEXT NOT NULL DEFAULT 'Pendiente de Pago',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      destination_account TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      operation_number TEXT,
      voucher_image TEXT,
      card_last4 TEXT,
      auth_code TEXT,
      payment_status TEXT NOT NULL DEFAULT 'Pendiente de Verificación',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payments_operation_number ON payments(operation_number);
    CREATE INDEX IF NOT EXISTS idx_payments_auth_code ON payments(auth_code);

    CREATE TABLE IF NOT EXISTS shipping_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT NOT NULL,
      province TEXT NOT NULL,
      cost REAL NOT NULL,
      delivery_days TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_shipping_rates_active ON shipping_rates(active);
  `);

  // 1.b Migración liviana: columnas de envío en orders (feature 007)
  const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
  if (!orderCols.includes('shipping_cost')) {
    db.exec('ALTER TABLE orders ADD COLUMN shipping_cost REAL NOT NULL DEFAULT 0');
  }
  if (!orderCols.includes('shipping_department')) {
    db.exec("ALTER TABLE orders ADD COLUMN shipping_department TEXT NOT NULL DEFAULT ''");
  }
  if (!orderCols.includes('shipping_province')) {
    db.exec("ALTER TABLE orders ADD COLUMN shipping_province TEXT NOT NULL DEFAULT ''");
  }

  // 1.c Un mismo número de operación aprobado no puede registrarse dos veces
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_operation_approved
      ON payments(operation_number)
      WHERE operation_number IS NOT NULL AND payment_status = 'Aprobado'
    `);
  } catch (err) {
    console.warn('[DB] No se pudo crear índice único de operaciones (datos duplicados previos):', err.message);
  }

  // 1.d Tarifas de envío iniciales
  const ratesCount = db.prepare('SELECT COUNT(*) as count FROM shipping_rates').get();
  if (ratesCount.count === 0) {
    const insertRate = db.prepare(
      'INSERT INTO shipping_rates (department, province, cost, delivery_days, active) VALUES (?, ?, ?, ?, 1)'
    );
    insertRate.run('Ayacucho', 'Huamanga', 8.0, '1 a 2 días hábiles');
    insertRate.run('Lima', 'Lima Metropolitana', 12.0, '2 a 3 días hábiles');
    insertRate.run('Nacional', 'Otras Provincias (Perú)', 18.0, '3 a 5 días hábiles');
  }

  // 2. Asegurar configuración base del administrador si no existe
  const settingsRow = db.prepare('SELECT COUNT(*) as count FROM store_settings').get();
  if (settingsRow.count === 0) {
    console.log('[Auto-Seed] Inicializando configuración base y cuenta única de Administrador...');

    db.prepare(`
      INSERT INTO store_settings (
        id, owner_name, yape_number, plin_number, bank_name, bank_account_soles, bank_cci, whatsapp_notification
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Jeancarlos José Huertas Quichca',
      '924046690',
      '983064501',
      'BCP - Banco de Crédito del Perú',
      '22079349234041',
      '00222017934923404128',
      '983064501'
    );
  }

  // 3. Asegurar que exista la cuenta única de Administrador si la tabla users está vacía
  const adminExists = db
    .prepare("SELECT id FROM users WHERE email = 'admin@fitstore.pe' LIMIT 1")
    .get();

  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (name, dni, email, phone, address, city, password, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'admin')
    `).run(
      'Administrador FitStore',
      '00000000',
      'admin@fitstore.pe',
      '983064501',
      'Oficina Central FitStore',
      'Lima',
      'admin123'
    );
    console.log('[Auto-Seed] Cuenta de Administrador admin@fitstore.pe lista (0 productos y 0 clientes demo).');
  }
}
