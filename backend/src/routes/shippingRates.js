import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function parseRatePayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.department !== undefined) {
    out.department = String(body.department ?? '').trim();
    if (!out.department) return { error: 'El departamento es obligatorio.' };
  }
  if (!partial || body.province !== undefined) {
    out.province = String(body.province ?? '').trim();
    if (!out.province) return { error: 'La provincia es obligatoria.' };
  }
  if (!partial || body.cost !== undefined) {
    const cost = Number(body.cost);
    if (body.cost === '' || body.cost === null || !Number.isFinite(cost) || cost < 0) {
      return { error: 'El costo de envío debe ser un monto en Soles mayor o igual a cero.' };
    }
    out.cost = Number(cost.toFixed(2));
  }
  if (!partial || body.delivery_days !== undefined) {
    out.delivery_days = String(body.delivery_days ?? '').trim() || 'A coordinar';
  }
  if (body.active !== undefined) {
    out.active = body.active === true || body.active === 1 || body.active === '1' ? 1 : 0;
  }
  return { value: out };
}

// GET /api/shipping-rates - tarifas activas para el Checkout (público)
router.get('/shipping-rates', (req, res) => {
  const rows = db
    .prepare('SELECT id, department, province, cost, delivery_days, active FROM shipping_rates WHERE active = 1 ORDER BY department, province')
    .all();
  res.json(rows);
});

// GET /api/admin/shipping-rates - todas las tarifas (Panel Admin)
router.get('/admin/shipping-rates', (req, res) => {
  const rows = db.prepare('SELECT * FROM shipping_rates ORDER BY department, province').all();
  res.json(rows);
});

// POST /api/admin/shipping-rates
router.post('/admin/shipping-rates', (req, res) => {
  const { value, error } = parseRatePayload(req.body || {});
  if (error) return res.status(400).json({ success: false, error: 'INVALID_FORMAT', message: error });
  const result = db
    .prepare('INSERT INTO shipping_rates (department, province, cost, delivery_days, active) VALUES (?, ?, ?, ?, ?)')
    .run(value.department, value.province, value.cost, value.delivery_days, value.active ?? 1);
  const created = db.prepare('SELECT * FROM shipping_rates WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ success: true, id: created.id, rate: created, message: 'Tarifa de envío registrada exitosamente' });
});

// PUT /api/admin/shipping-rates/:id
router.put('/admin/shipping-rates/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM shipping_rates WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Tarifa no encontrada.' });
  }
  const { value, error } = parseRatePayload(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ success: false, error: 'INVALID_FORMAT', message: error });
  const merged = { ...existing, ...value };
  db.prepare(
    'UPDATE shipping_rates SET department = ?, province = ?, cost = ?, delivery_days = ?, active = ? WHERE id = ?'
  ).run(merged.department, merged.province, merged.cost, merged.delivery_days, merged.active, id);
  const updated = db.prepare('SELECT * FROM shipping_rates WHERE id = ?').get(id);
  res.json({ success: true, rate: updated, message: 'Tarifa de envío actualizada exitosamente' });
});

// DELETE /api/admin/shipping-rates/:id
router.delete('/admin/shipping-rates/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM shipping_rates WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Tarifa no encontrada.' });
  }
  res.json({ success: true, message: 'Tarifa de envío eliminada' });
});

export default router;
