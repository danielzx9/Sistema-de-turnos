const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('./auth');
const ServiceController = require('../controllers/ServiceController');

const router = express.Router();

// Obtener todos los servicios
router.get('/', ServiceController.getAll);

// Obtener todos los servicios (admin)
router.get('/admin', authenticateToken, ServiceController.getAllAdmin);

// Crear nuevo servicio
router.post('/', [
  authenticateToken,
  body('name').notEmpty().withMessage('Nombre del servicio es requerido'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo')
], ServiceController.create);

// Actualizar servicio
router.put('/:id', [
  authenticateToken,
  body('name').notEmpty().withMessage('Nombre del servicio es requerido'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo')
], ServiceController.update);

// Desactivar servicio
router.delete('/:id/desactivate', authenticateToken, ServiceController.deactivate);

// Eliminar servicio permanentemente
router.delete('/:id/destroy', authenticateToken, ServiceController.delete);

// Obtener servicio por ID
router.get('/:id', ServiceController.getById);

module.exports = router;
