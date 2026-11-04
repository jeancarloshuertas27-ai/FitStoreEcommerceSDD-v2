import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/settings - Obtener configuración y cuentas receptoras del propietario
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
    if (!settings) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener store_settings:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/settings - Actualizar datos bancarios y billeteras del propietario
router.put('/', (req, res) => {
  try {
    const {
      owner_name,
      yape_number,
      plin_number,
      bank_name,
      bank_account_soles,
      bank_cci,
      whatsapp_notification
    } = req.body;

    const stmt = db.prepare(`
      UPDATE store_settings
      SET owner_name = ?,
          yape_number = ?,
          plin_number = ?,
          bank_name = ?,
          bank_account_soles = ?,
          bank_cci = ?,
          whatsapp_notification = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);

    stmt.run(
      owner_name,
      yape_number,
      plin_number,
      bank_name,
      bank_account_soles,
      bank_cci,
      whatsapp_notification
    );

    const updated = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar store_settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

export default router;

