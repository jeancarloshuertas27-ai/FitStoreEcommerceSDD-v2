-- ==============================================================================
-- FITSTORE PRO - ESQUEMA Y SEMILLAS INICIALES PARA CLOUDFLARE D1 (fitstore-db)
-- ==============================================================================

-- 1. Tabla de Configuración de la Tienda y Cuentas del Propietario
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

-- 2. Tabla de Usuarios (Admin y Clientes)
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

-- 3. Tabla de Productos Fitness (Catálogo Oficial en Soles S/)
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

-- 4. Tabla de Pedidos / Órdenes
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

-- 5. Tabla de Ítems del Pedido
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

-- 6. Tabla de Pagos Dirigidos al Propietario
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

-- ==============================================================================
-- INSERCIÓN DE DATOS SEMILLA (AUTO-SEED)
-- ==============================================================================

-- Configuración del Propietario
INSERT OR IGNORE INTO store_settings (id, owner_name, yape_number, plin_number, bank_name, bank_account_soles, bank_cci, whatsapp_notification)
VALUES (1, 'Jeancarlos José Huertas Quichca', '924046690', '983064501', 'BCP - Banco de Crédito del Perú', '22079349234041', '00222017934923404128', '983064501');

-- Usuarios Iniciales (1 Admin, 2 Clientes)
INSERT OR IGNORE INTO users (id, name, dni, email, phone, address, city, password, role) VALUES
(1, 'Administrador FitStore', '00000000', 'admin@fitstore.pe', '983064501', 'Oficina Central FitStore', 'Lima', 'admin123', 'admin'),
(2, 'Carlos Mendoza Ríos', '72458912', 'carlos.mendoza@gmail.com', '987654321', 'Av. Arequipa 2450, Dpto 402', 'Lima', 'cliente123', 'client'),
(3, 'Valeria Gómez Paredes', '45891234', 'valeria.gomez@hotmail.com', '912345678', 'Calle Los Pinos 180, Miraflores', 'Lima', 'cliente123', 'client');

-- 8 Productos Fitness Oficiales
INSERT OR IGNORE INTO products (id, name, description, category, price, stock, image_url, featured) VALUES
(1, 'Gold Standard 100% Whey 2lb (Optimum Nutrition)', 'Proteína aislada de suero de leche de absorción ultra rápida con 24g de proteína pura por servicio.', 'Proteínas', 189.90, 25, 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=800&q=80', 1),
(2, 'ISO 100 Hydrolyzed 5lb (Dymatize)', 'Proteína hidrolizada premium de rápida digestión con 25g de proteína y cero azúcar.', 'Proteínas', 249.00, 18, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 1),
(3, 'Creatina Monohidratada Creapure 300g (Universal)', 'Creatina Creapure 100% micronizada de máxima pureza para potencia y ganancia de masa muscular.', 'Creatinas', 115.00, 40, 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=800&q=80', 1),
(4, 'Creatine Micronized 5000mg (Optimum Nutrition)', 'Suplemento de creatina monohidratada de alta absorción sin sabor para mejorar el rendimiento atlético.', 'Creatinas', 135.00, 32, 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80', 0),
(5, 'C4 Original Pre-Workout 30 serv (Cellucor)', 'Energía explosiva, enfoque mental láser y bombeo muscular intenso para tus sesiones más pesadas.', 'Pre-Entrenos', 129.00, 22, 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80', 1),
(6, 'The Curse! Advanced Pre-Workout (JNX Sports)', 'Fórmula de pre-entrenamiento de alta potencia para resistencia y fuerza extrema sin bajones.', 'Pre-Entrenos', 119.00, 20, 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80', 0),
(7, 'Shaker Pro BlenderBottle Pro45 (45oz)', 'Botella mezcladora extra grande con batidor de acero quirúrgico libre de BPA y cierre hermético.', 'Accesorios', 45.00, 50, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80', 0),
(8, 'Cinturón de Cuero para Levantamiento Pesado (Powerlifting)', 'Cinturón de cuero reforzado de 10mm con hebilla de acero inoxidable para soporte lumbar en sentadillas y peso muerto.', 'Accesorios', 95.00, 28, 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=800&q=80', 1);

-- Pedidos y Pagos Demostrativos Iniciales
INSERT OR IGNORE INTO orders (id, order_code, user_id, customer_name, customer_dni, customer_phone, shipping_address, total, order_status) VALUES
(1, 'ORD-2026-001', 2, 'Carlos Mendoza Ríos', '72458912', '987654321', 'Av. Arequipa 2450, Dpto 402, Lima', 304.90, 'Pagado / En Preparación'),
(2, 'ORD-2026-002', 3, 'Valeria Gómez Paredes', '45891234', '912345678', 'Calle Los Pinos 180, Miraflores, Lima', 129.00, 'En Verificación');

INSERT OR IGNORE INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 'Gold Standard 100% Whey 2lb (Optimum Nutrition)', 1, 189.90, 189.90),
(2, 1, 3, 'Creatina Monohidratada Creapure 300g (Universal)', 1, 115.00, 115.00),
(3, 2, 5, 'C4 Original Pre-Workout 30 serv (Cellucor)', 1, 129.00, 129.00);

INSERT OR IGNORE INTO payments (id, order_id, method, destination_account, amount, currency, operation_number, payment_status) VALUES
(1, 1, 'Yape', 'Yape titular: 924046690 (Jeancarlos José Huertas Quichca)', 304.90, 'PEN', 'OP-982145', 'Aprobado'),
(2, 2, 'Transferencia Bancaria', 'BCP Soles: 22079349234041 - CCI: 00222017934923404128 (Jeancarlos José Huertas Quichca)', 129.00, 'PEN', 'OP-441290', 'Pendiente de Verificación');
