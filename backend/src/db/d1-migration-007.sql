-- ==============================================================================
-- MIGRACIÓN FEATURE 007 PARA CLOUDFLARE D1 EXISTENTE (fitstore-db)
-- NO borra datos. Ejecutar UNA sola vez:
--   cf d1 execute fitstore-db --remote --file=backend/src/db/d1-migration-007.sql
-- (Si las columnas de orders ya existen, omite las 3 primeras sentencias ALTER.)
-- ==============================================================================

ALTER TABLE orders ADD COLUMN shipping_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_department TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN shipping_province TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_operation_approved
  ON payments(operation_number)
  WHERE operation_number IS NOT NULL AND payment_status = 'Aprobado';

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
