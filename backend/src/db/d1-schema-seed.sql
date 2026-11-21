-- ==============================================================================
-- FITSTORE PRO - ESQUEMA INICIAL LIMPIO PARA CLOUDFLARE D1 (fitstore-db)
-- 0 productos de prueba, 0 clientes demo, 0 pedidos; solo Administrador único.
-- ==============================================================================

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
  shipping_cost REAL NOT NULL DEFAULT 0,
  shipping_department TEXT NOT NULL DEFAULT '',
  shipping_province TEXT NOT NULL DEFAULT '',
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

-- Feature 007: un mismo número de operación aprobado no puede registrarse dos veces
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_operation_approved
  ON payments(operation_number)
  WHERE operation_number IS NOT NULL AND payment_status = 'Aprobado';

-- Feature 007: tarifas de envío por departamento/provincia
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

INSERT INTO shipping_rates (department, province, cost, delivery_days, active)
SELECT 'Ayacucho', 'Huamanga', 8.00, '1 a 2 días hábiles', 1 WHERE NOT EXISTS (SELECT 1 FROM shipping_rates);
INSERT INTO shipping_rates (department, province, cost, delivery_days, active)
SELECT 'Lima', 'Lima Metropolitana', 12.00, '2 a 3 días hábiles', 1 WHERE (SELECT COUNT(*) FROM shipping_rates) = 1;
INSERT INTO shipping_rates (department, province, cost, delivery_days, active)
SELECT 'Nacional', 'Otras Provincias (Perú)', 18.00, '3 a 5 días hábiles', 1 WHERE (SELECT COUNT(*) FROM shipping_rates) = 2;

-- Limpieza de datos de demostración y reseteo a estado limpio
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM users WHERE email != 'admin@fitstore.pe';

-- Configuración privada del propietario (solo visible para Admin)
INSERT OR IGNORE INTO store_settings (id, owner_name, yape_number, plin_number, bank_name, bank_account_soles, bank_cci, whatsapp_notification)
VALUES (1, 'Jeancarlos José Huertas Quichca', '924046690', '983064501', 'BCP - Banco de Crédito del Perú', '22079349234041', '00222017934923404128', '983064501');

-- Única cuenta inicial: Administrador
INSERT OR IGNORE INTO users (id, name, dni, email, phone, address, city, password, role)
VALUES (1, 'Administrador FitStore', '00000000', 'admin@fitstore.pe', '983064501', 'Oficina Central FitStore', 'Lima', 'admin123', 'admin');
