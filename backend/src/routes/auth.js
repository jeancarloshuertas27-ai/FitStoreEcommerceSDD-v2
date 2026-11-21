import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// POST /api/auth/register - Registro real de clientes desde la tienda
router.post('/register', (req, res) => {
  try {
    const { name, dni, email, phone, address, city, password } = req.body || {};

    if (!name?.trim() || !dni?.trim() || !email?.trim() || !phone?.trim() || !address?.trim() || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios para crear tu cuenta.' });
    }

    const cleanDni = String(dni).trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!/^\d{8}$/.test(cleanDni)) {
      return res.status(400).json({ error: 'El DNI debe contener exactamente 8 dígitos numéricos.' });
    }
    if (!/^\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'El número de celular debe contener exactamente 9 dígitos numéricos.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = ? OR dni = ? LIMIT 1')
      .get(cleanEmail, cleanDni);
    if (existing) {
      return res.status(409).json({
        error: 'Ya existe una cuenta registrada con ese correo electrónico o número de DNI.',
      });
    }

    const result = db
      .prepare(`
        INSERT INTO users (name, dni, email, phone, address, city, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'client')
      `)
      .run(
        name.trim(),
        cleanDni,
        cleanEmail,
        cleanPhone,
        address.trim(),
        city?.trim() || 'Lima',
        String(password)
      );

    const created = db
      .prepare('SELECT id, name, dni, email, phone, address, city, role, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      user: created,
    });
  } catch (error) {
    console.error('Error en POST /api/auth/register:', error);
    res.status(500).json({ error: 'Error al registrar la cuenta en SQLite.' });
  }
});

// POST /api/auth/login - Inicio de sesión real de clientes
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Ingresa tu correo electrónico y contraseña.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db
      .prepare("SELECT * FROM users WHERE LOWER(email) = ? AND role = 'client' LIMIT 1")
      .get(cleanEmail);

    if (!user || user.password !== String(password)) {
      return res.status(401).json({ error: 'Correo electrónico o contraseña incorrectos.' });
    }

    const { password: _, ...safeUser } = user;
    res.json({
      message: 'Sesión iniciada correctamente',
      user: safeUser,
    });
  } catch (error) {
    console.error('Error en POST /api/auth/login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

export default router;
