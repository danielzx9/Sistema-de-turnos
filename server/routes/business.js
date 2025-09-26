const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('./auth');
const BusinessController = require('../controllers/BusinessController');

const router = express.Router();

// Obtener configuración del negocio
router.get('/config', authenticateToken, BusinessController.getConfig);

// Actualizar configuración del negocio
router.put('/config', [
  authenticateToken,
  body('business_name').notEmpty().withMessage('Nombre del negocio es requerido'),
  body('open_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de apertura inválida'),
  body('close_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de cierre inválida'),
  body('slot_duration').isInt({ min: 5, max: 120 }).withMessage('Duración de slot debe estar entre 5 y 120 minutos')
], BusinessController.updateConfig);

// Obtener estadísticas del negocio
router.get('/stats', authenticateToken, BusinessController.getStats);

// Obtener horarios especiales
router.get('/special-schedules', BusinessController.getSpecialSchedules);

// Crear horario especial
router.post('/special-schedules', [
  authenticateToken,
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('is_closed').isBoolean().withMessage('is_closed debe ser booleano')
], BusinessController.createSpecialSchedule);

// Eliminar horario especial
router.delete('/special-schedules/:id', authenticateToken, BusinessController.deleteSpecialSchedule);

module.exports = router;
