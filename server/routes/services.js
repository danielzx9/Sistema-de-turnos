const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Obtener todos los servicios
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all(
    'SELECT * FROM services WHERE is_active = 1 ORDER BY name',
    (err, services) => {
      if (err) {
        console.error('Error al obtener servicios:', err);
        return res.status(500).json({ error: 'Error al obtener servicios' });
      }
      
      res.json(services);
    }
  );
});

// Obtener todos los servicios (admin)
router.get('/admin', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.all(
    'SELECT * FROM services ORDER BY name',
    (err, services) => {
      if (err) {
        console.error('Error al obtener servicios:', err);
        return res.status(500).json({ error: 'Error al obtener servicios' });
      }
      
      res.json(services);
    }
  );
});

// Crear nuevo servicio
router.post('/', [
  authenticateToken,
  body('name').notEmpty().withMessage('Nombre del servicio es requerido'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, duration, price } = req.body;
  const db = getDatabase();
  
  db.run(
    'INSERT INTO services (name, description, duration, price) VALUES (?, ?, ?, ?)',
    [name, description || null, duration, price],
    function(err) {
      if (err) {
        console.error('Error al crear servicio:', err);
        return res.status(500).json({ error: 'Error al crear servicio' });
      }
      
      res.status(201).json({
        message: 'Servicio creado exitosamente',
        serviceId: this.lastID
      });
    }
  );
});

// Actualizar servicio
router.put('/:id', [
  authenticateToken,
  body('name').notEmpty().withMessage('Nombre del servicio es requerido'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { name, description, duration, price, is_active } = req.body;
  const db = getDatabase();
  
  db.run(
    'UPDATE services SET name = ?, description = ?, duration = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description || null, duration, price, is_active !== undefined ? is_active : 1, id],
    function(err) {
      if (err) {
        console.error('Error al actualizar servicio:', err);
        return res.status(500).json({ error: 'Error al actualizar servicio' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }
      
      res.json({ message: 'Servicio actualizado exitosamente' });
    }
  );
});

// Eliminar servicio (soft delete)
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  // Verificar si hay turnos pendientes para este servicio
  db.get(
    'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND status IN ("pending", "confirmed")',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar turnos' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'No se puede eliminar el servicio porque tiene turnos pendientes' 
        });
      }
      
      // Desactivar servicio en lugar de eliminarlo
      db.run(
        'UPDATE services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error al eliminar servicio' });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
          }
          
          res.json({ message: 'Servicio eliminado exitosamente' });
        }
      );
    }
  );
});

// Obtener servicio por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get(
    'SELECT * FROM services WHERE id = ? AND is_active = 1',
    [id],
    (err, service) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener servicio' });
      }
      
      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }
      
      res.json(service);
    }
  );
});

module.exports = router;
