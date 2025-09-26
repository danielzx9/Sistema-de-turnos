const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('./auth');
const AppointmentController = require('../controllers/AppointmentController');

const router = express.Router();

// Obtener todos los turnos (admin)
router.get('/', authenticateToken, AppointmentController.getAll);

// Obtener turnos disponibles para una fecha
router.get('/available', AppointmentController.getAvailableSlots);

// Crear nuevo turno
router.post('/', [
  body('clientName').notEmpty().withMessage('Nombre del cliente es requerido'),
  body('clientPhone').notEmpty().withMessage('Teléfono del cliente es requerido'),
  body('serviceId').isInt().withMessage('ID de servicio inválido'),
  body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida')
], AppointmentController.create);

// Actualizar estado de turno
router.put('/:id/status', [
  authenticateToken,
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Estado inválido')
], AppointmentController.updateStatus);

// Obtener turno por ID
router.get('/:id', authenticateToken, AppointmentController.getById);

// Eliminar turno
router.delete('/:id', authenticateToken, AppointmentController.delete);

module.exports = router;
