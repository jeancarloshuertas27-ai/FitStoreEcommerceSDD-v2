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

    if (!owner_name || !owner_name.trim()) {
      return res.status(400).json({ error: 'El nombre del titular es obligatorio' });
    }

    if (yape_number && !/^\d{9}$/.test(yape_number)) {
      return res.status(400).json({ error: 'El número de Yape debe contener exactamente 9 dígitos numéricos' });
    }

    if (plin_number && !/^\d{9}$/.test(plin_number)) {
      return res.status(400).json({ error: 'El número de Plin debe contener exactamente 9 dígitos numéricos' });
    }

    if (whatsapp_notification && !/^\d{9}$/.test(whatsapp_notification)) {
      return res.status(400).json({ error: 'El número de WhatsApp debe contener exactamente 9 dígitos numéricos' });
    }

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
      owner_name.trim(),
      yape_number ? yape_number.trim() : '',
      plin_number ? plin_number.trim() : '',
      bank_name ? bank_name.trim() : 'BCP - Banco de Crédito del Perú',
      bank_account_soles ? bank_account_soles.trim() : '',
      bank_cci ? bank_cci.trim() : '',
      whatsapp_notification ? whatsapp_notification.trim() : ''
    );

    const updated = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
    res.json({
      ...updated,
      message: 'Configuración de cuentas actualizada correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar store_settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

export default router;

