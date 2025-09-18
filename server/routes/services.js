const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Obtener todos los servicios
router.get('/', async (req, res) => {
  const { barbershopId = 1 } = req.query;
  const pool = getPool();

  try {
    const [services] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE is_active = 1 AND barbershop_id = ? ORDER BY name',
      [barbershopId]
    );

    res.json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Obtener todos los servicios (admin)
router.get('/admin', authenticateToken, async (req, res) => {
  const pool = getPool();

  try {
    const [services] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE barbershop_id = ? ORDER BY name',
      [req.user.barbershop_id]
    );

    res.json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Crear nuevo servicio
router.post('/', [
  authenticateToken,
  body('name').notEmpty().withMessage('Nombre del servicio es requerido'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, duration, price } = req.body;
  const pool = getPool();

  try {
    const [result] = await pool.execute(
      'INSERT INTO services (barbershop_id, name, description, duration, price) VALUES (?, ?, ?, ?, ?)',
      [req.user.barbershop_id, name, description || null, duration, price]
    );

    res.status(201).json({
      message: 'Servicio creado exitosamente',
      serviceId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// Actualizar servicio
router.put('/:id', [
  authenticateToken,
  body('name').notEmpty().withMessage('Nombre del servicio es requerido'),
  body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, description, duration, price, is_active } = req.body;
  const pool = getPool();

  try {
    const [result] = await pool.execute(
      'UPDATE services SET name = ?, description = ?, duration = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE idservices = ? AND barbershop_id = ?',
      [name, description || null, duration, price, is_active !== undefined ? is_active : 1, id, req.user.barbershop_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ message: 'Servicio actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// 1. Ruta para el SOFT DELETE (mantienes esta, ideal para el dinamismo)
router.delete('/:id/desactivate', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();

  try {
    // Verifica turnos pendientes
    const [pendingRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND barbershop_id = ? AND status IN ("pending", "confirmed")',
      [id, req.user.barbershop_id]
    );

    if (pendingRows[0].count > 0) {
      return res.status(400).json({
        error: 'No se puede desactivar el servicio porque tiene turnos pendientes.'
      });
    }

    // Desactiva el servicio
    const [result] = await pool.execute(
      'UPDATE services SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE idservices = ? AND barbershop_id = ?',
      [id, req.user.barbershop_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado.' });
    }

    res.json({ message: 'Servicio desactivado exitosamente.' });
  } catch (error) {
    console.error('Error al desactivar servicio:', error);
    res.status(500).json({ error: 'Error al desactivar servicio.' });
  }
});

// 2. Ruta para el HARD DELETE (nueva ruta para eliminarlo permanentemente)
router.delete('/:id/destroy', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();

  try {
    // Esta lógica es crucial: asegúrate de que no haya referencias
    const [appointmentRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND barbershop_id = ?',
      [id, req.user.barbershop_id]
    );

    // Si encuentra algún turno (pendiente, cancelado, completado), no lo borra
    if (appointmentRows[0].count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar permanentemente el servicio porque tiene historial de turnos.'
      });
    }

    // Si no hay referencias, procede a la eliminación física
    const [result] = await pool.execute(
      'DELETE FROM services WHERE idservices = ? AND barbershop_id = ?',
      [id, req.user.barbershop_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado.' });
    }

    res.json({ message: 'Servicio eliminado permanentemente.' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error al eliminar servicio permanentemente.' });
  }
});

// Obtener servicio por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { barbershopId = 1 } = req.query;
  const pool = getPool();

  try {
    const [rows] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE idservices = ? AND is_active = 1 AND barbershop_id = ?',
      [id, barbershopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

module.exports = router;
