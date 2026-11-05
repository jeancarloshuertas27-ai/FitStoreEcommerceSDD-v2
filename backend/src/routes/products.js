import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/products - Listar productos con búsqueda, filtro de categoría y ordenamiento
router.get('/', (req, res) => {
  try {
    const { category, search, sort } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'Todos') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else {
      query += ' ORDER BY featured DESC, id ASC';
    }

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/:id - Detalle de un producto específico
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/products - Crear un nuevo producto en el catálogo
router.post('/', (req, res) => {
  try {
    const { name, description, category, price, stock, image_url, featured } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    const validCategories = ['Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`,
      });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor a cero en Soles (S/)' });
    }

    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      return res.status(400).json({ error: 'El stock debe ser un número entero mayor o igual a 0' });
    }

    const finalImage =
      image_url && image_url.trim()
        ? image_url.trim()
        : 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&q=80&w=800';

    const stmt = db.prepare(`
      INSERT INTO products (name, description, category, price, stock, image_url, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      description ? description.trim() : 'Suplemento fitness oficial de alta calidad.',
      category,
      numPrice,
      numStock,
      finalImage,
      featured ? 1 : 0
    );

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al registrar el producto en SQLite' });
  }
});

// PUT /api/products/:id - Editar datos, precio y stock de un producto
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const { name, description, category, price, stock, image_url, featured } = req.body;

    const validCategories = ['Proteínas', 'Creatinas', 'Pre-Entrenos', 'Accesorios'];
    const finalCategory = category || existing.category;
    if (!validCategories.includes(finalCategory)) {
      return res.status(400).json({
        error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`,
      });
    }

    const finalPrice = price !== undefined ? Number(price) : existing.price;
    if (isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor a cero en Soles (S/)' });
    }

    const finalStock = stock !== undefined ? Number(stock) : existing.stock;
    if (isNaN(finalStock) || finalStock < 0 || !Number.isInteger(finalStock)) {
      return res.status(400).json({ error: 'El stock debe ser un número entero mayor o igual a 0' });
    }

    const stmt = db.prepare(`
      UPDATE products
      SET name = ?,
          description = ?,
          category = ?,
          price = ?,
          stock = ?,
          image_url = ?,
          featured = ?
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      description !== undefined ? description.trim() : existing.description,
      finalCategory,
      finalPrice,
      finalStock,
      image_url !== undefined && image_url.trim() ? image_url.trim() : existing.image_url,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({
      ...updated,
      message: 'Producto actualizado correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto en SQLite' });
  }
});

// DELETE /api/products/:id - Eliminar producto del catálogo activo preservando el historial de órdenes
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Desactivar temporalmente foreign keys para eliminar el producto sin borrar el histórico de order_items
    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    db.exec('PRAGMA foreign_keys = ON;');

    res.json({
      message: 'Producto eliminado exitosamente del catálogo activo',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto en SQLite' });
  }
});

export default router;

