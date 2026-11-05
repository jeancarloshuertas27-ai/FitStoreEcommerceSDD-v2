import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/seed.js';
import settingsRouter from './routes/settings.js';
import productsRouter from './routes/products.js';
import usersRouter from './routes/users.js';
import ordersRouter from './routes/orders.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Inicializar base de datos SQLite y Auto-Seed
try {
  initializeDatabase();
} catch (error) {
  console.error('[Error Crítico] Falló la inicialización de la base de datos:', error);
  process.exit(1);
}

// 2. Middlewares globales
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 3. Verificación de salud (Health Check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'FitStore Pro',
    database: 'SQLite (database.sqlite) connected',
    timestamp: new Date().toISOString()
  });
});

// 4. Montaje de rutas REST
app.use('/api/settings', settingsRouter);
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);

// 5. Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[Error de Servidor]', err);
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor' });
});

// 6. Iniciar escucha
app.listen(PORT, () => {
  console.log(`🚀 FitStore Pro API Backend activo en http://localhost:${PORT}`);
});

