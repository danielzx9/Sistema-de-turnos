const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();


const { initializeDatabase } = require('./database/init');
const { router: authRoutes } = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');
const businessRoutes = require('./routes/business');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet());
app.use(
  cors({
    origin: [
      'https://dajo-system.lat', // Tu dominio del frontend
      'https://www.dajo-system.lat', // Por si usas el www
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use('/api/', limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar base de datos y servidor
async function startServer() {
  await initializeDatabase();
  try {
    console.log('✅ Base de datos inicializada correctamente');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📱 API disponible en http://localhost:${PORT}/api`);
      console.log(`🏥 Sistema de turnos listo para usar!`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

startServer();
