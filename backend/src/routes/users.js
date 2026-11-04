import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/users - Listar usuarios (para alternar perfiles demo o gestión)
router.get('/', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, dni, email, phone, address, city, role, created_at
      FROM users
      ORDER BY id ASC
    `).all();
    res.json(users);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/users/:id - Detalle de un usuario
router.get('/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, dni, email, phone, address, city, role, created_at
      FROM users
      WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// PUT /api/users/:id - Actualizar datos del cliente
router.put('/:id', (req, res) => {
  try {
    const { name, dni, email, phone, address, city } = req.body;

    // Validación DNI de 8 dígitos
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'El DNI debe contener exactamente 8 dígitos numéricos' });
    }

    // Validación Celular de 9 dígitos
    if (!/^\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'El número de celular debe contener exactamente 9 dígitos numéricos' });
    }

    const stmt = db.prepare(`
      UPDATE users
      SET name = ?,
          dni = ?,
          email = ?,
          phone = ?,
          address = ?,
          city = ?
      WHERE id = ?
    `);

    stmt.run(name, dni, email, phone, address, city, req.params.id);

    const updated = db.prepare(`
      SELECT id, name, dni, email, phone, address, city, role, created_at
      FROM users
      WHERE id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar datos de usuario' });
  }
});

// POST /api/users - Registrar nuevo cliente
router.post('/', (req, res) => {
  try {
    const { name, dni, email, phone, address, city, password, role } = req.body;

    if (!name || !dni || !email || !phone || !address || !city) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'El DNI debe contener exactamente 8 dígitos numéricos' });
    }

    if (!/^\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'El celular debe contener exactamente 9 dígitos numéricos' });
    }

    const stmt = db.prepare(`
      INSERT INTO users (name, dni, email, phone, address, city, password, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      dni,
      email,
      phone,
      address,
      city,
      password || 'cliente123',
      role || 'client'
    );

    const newUser = db.prepare(`
      SELECT id, name, dni, email, phone, address, city, role, created_at
      FROM users
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El DNI o Correo ya se encuentra registrado' });
    }
    res.status(500).json({ error: 'Error al registrar nuevo cliente' });
  }
});

export default router;

