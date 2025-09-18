const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Obtener configuración del negocio
router.get('/config', async (req, res) => {
  const { barbershopId = 1 } = req.query;
  const pool = getPool();

  try {
    const [rows] = await pool.execute(
      'SELECT idbarbershops as id, business_name, business_phone, business_address, business_email, open_time, close_time, slot_duration, working_days, created_at, updated_at FROM barbershops WHERE idbarbershops = ?',
      [barbershopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Actualizar configuración del negocio
router.put('/config', [
  authenticateToken,
  body('business_name').notEmpty().withMessage('Nombre del negocio es requerido'),
  body('open_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de apertura inválida'),
  body('close_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de cierre inválida'),
  body('slot_duration').isInt({ min: 5, max: 120 }).withMessage('Duración de slot debe estar entre 5 y 120 minutos')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    business_name,
    business_phone,
    business_address,
    business_email,
    open_time,
    close_time,
    slot_duration,
    working_days
  } = req.body;

  const pool = getPool();

  try {
    // Actualizar barbería del usuario autenticado
    const [result] = await pool.execute(
      `UPDATE barbershops SET
        business_name = ?,
        business_phone = ?,
        business_address = ?,
        business_email = ?,
        open_time = ?,
        close_time = ?,
        slot_duration = ?,
        working_days = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE idbarbershops = ?`,
      [
        business_name,
        business_phone || null,
        business_address || null,
        business_email || null,
        open_time,
        close_time,
        slot_duration,
        working_days || '1,2,3,4,5,6',
        req.user.barbershop_id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Barbería no encontrada' });
    }

    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// Obtener estadísticas del negocio
router.get('/stats', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const pool = getPool();

  try {
    let dateFilter = '';
    const params = [req.user.barbershop_id];

    if (startDate && endDate) {
      dateFilter = 'AND a.appointment_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const queries = {
      totalAppointments: `
        SELECT COUNT(*) as count FROM appointments a WHERE a.barbershop_id = ? ${dateFilter}
      `,
      completedAppointments: `
        SELECT COUNT(*) as count FROM appointments a WHERE a.barbershop_id = ? ${dateFilter} AND a.status = 'completed'
      `,
      pendingAppointments: `
        SELECT COUNT(*) as count FROM appointments a WHERE a.barbershop_id = ? ${dateFilter} AND a.status = 'pending'
      `,
      totalRevenue: `
        SELECT COALESCE(SUM(s.price), 0) as total FROM appointments a
        JOIN services s ON a.service_id = s.idservices
        WHERE a.barbershop_id = ? ${dateFilter} AND a.status = 'completed'
      `,
      popularServices: `
        SELECT s.name, COUNT(*) as count FROM appointments a
        JOIN services s ON a.service_id = s.idservices
        WHERE a.barbershop_id = ? ${dateFilter} AND a.status = 'completed'
        GROUP BY s.idservices, s.name
        ORDER BY count DESC
        LIMIT 5
      `
    };

    const results = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const [rows] = await pool.execute(query, params);
        if (key === 'popularServices') {
          results[key] = rows;
        } else {
          results[key] = rows[0].count || rows[0].total || 0;
        }
      } catch (error) {
        console.error(`Error en query ${key}:`, error);
        results[key] = key === 'popularServices' ? [] : 0;
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Obtener horarios especiales
router.get('/special-schedules', async (req, res) => {
  const { startDate, endDate, barbershopId = 1 } = req.query;
  const pool = getPool();

  try {
    let query = 'SELECT * FROM special_schedules WHERE barbershop_id = ?';
    const params = [barbershopId];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date';

    const [schedules] = await pool.execute(query, params);
    res.json(schedules);
  } catch (error) {
    console.error('Error al obtener horarios especiales:', error);
    res.status(500).json({ error: 'Error al obtener horarios especiales' });
  }
});

// Crear horario especial
router.post('/special-schedules', [
  authenticateToken,
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('is_closed').isBoolean().withMessage('is_closed debe ser booleano')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, is_closed, open_time, close_time, notes } = req.body;
  const pool = getPool();

  try {
    const [result] = await pool.execute(
      'INSERT INTO special_schedules (barbershop_id, date, is_closed, open_time, close_time, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.barbershop_id, date, is_closed, open_time || null, close_time || null, notes || null]
    );

    res.status(201).json({
      message: 'Horario especial creado exitosamente',
      scheduleId: result.insertId
    });
  } catch (error) {
    console.error('Error al crear horario especial:', error);
    res.status(500).json({ error: 'Error al crear horario especial' });
  }
});

// Eliminar horario especial
router.delete('/special-schedules/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [result] = await pool.execute(
      'DELETE FROM special_schedules WHERE idspecial_schedules = ? AND barbershop_id = ?',
      [id, req.user.barbershop_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Horario especial no encontrado' });
    }

    res.json({ message: 'Horario especial eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar horario especial:', error);
    res.status(500).json({ error: 'Error al eliminar horario especial' });
  }
});

module.exports = router;
