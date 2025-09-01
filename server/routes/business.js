const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Obtener configuración del negocio
router.get('/config', (req, res) => {
  const db = getDatabase();
  
  db.get(
    'SELECT * FROM business_config ORDER BY id DESC LIMIT 1',
    (err, config) => {
      if (err) {
        console.error('Error al obtener configuración:', err);
        return res.status(500).json({ error: 'Error al obtener configuración' });
      }
      
      if (!config) {
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }
      
      res.json(config);
    }
  );
});

// Actualizar configuración del negocio
router.put('/config', [
  authenticateToken,
  body('business_name').notEmpty().withMessage('Nombre del negocio es requerido'),
  body('open_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de apertura inválida'),
  body('close_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de cierre inválida'),
  body('slot_duration').isInt({ min: 5, max: 120 }).withMessage('Duración de slot debe estar entre 5 y 120 minutos')
], (req, res) => {
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
  
  const db = getDatabase();
  
  // Verificar si ya existe configuración
  db.get('SELECT id FROM business_config LIMIT 1', (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Error al verificar configuración' });
    }
    
    if (existing) {
      // Actualizar configuración existente
      db.run(
        `UPDATE business_config SET 
          business_name = ?, 
          business_phone = ?, 
          business_address = ?, 
          business_email = ?, 
          open_time = ?, 
          close_time = ?, 
          slot_duration = ?, 
          working_days = ?,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [
          business_name,
          business_phone || null,
          business_address || null,
          business_email || null,
          open_time,
          close_time,
          slot_duration,
          working_days || '1,2,3,4,5',
          existing.id
        ],
        function(err) {
          if (err) {
            console.error('Error al actualizar configuración:', err);
            return res.status(500).json({ error: 'Error al actualizar configuración' });
          }
          
          res.json({ message: 'Configuración actualizada exitosamente' });
        }
      );
    } else {
      // Crear nueva configuración
      db.run(
        `INSERT INTO business_config (
          business_name, business_phone, business_address, business_email,
          open_time, close_time, slot_duration, working_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          business_name,
          business_phone || null,
          business_address || null,
          business_email || null,
          open_time,
          close_time,
          slot_duration,
          working_days || '1,2,3,4,5'
        ],
        function(err) {
          if (err) {
            console.error('Error al crear configuración:', err);
            return res.status(500).json({ error: 'Error al crear configuración' });
          }
          
          res.status(201).json({ message: 'Configuración creada exitosamente' });
        }
      );
    }
  });
});

// Obtener estadísticas del negocio
router.get('/stats', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  const db = getDatabase();
  
  let dateFilter = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = 'WHERE a.appointment_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  const queries = {
    totalAppointments: `
      SELECT COUNT(*) as count FROM appointments a ${dateFilter}
    `,
    completedAppointments: `
      SELECT COUNT(*) as count FROM appointments a ${dateFilter} AND a.status = 'completed'
    `,
    pendingAppointments: `
      SELECT COUNT(*) as count FROM appointments a ${dateFilter} AND a.status = 'pending'
    `,
    totalRevenue: `
      SELECT COALESCE(SUM(s.price), 0) as total FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      ${dateFilter} AND a.status = 'completed'
    `,
    popularServices: `
      SELECT s.name, COUNT(*) as count FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      ${dateFilter} AND a.status = 'completed'
      GROUP BY s.id, s.name 
      ORDER BY count DESC 
      LIMIT 5
    `
  };
  
  const results = {};
  let completedQueries = 0;
  const totalQueries = Object.keys(queries).length;
  
  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, params, (err, result) => {
      if (err) {
        console.error(`Error en query ${key}:`, err);
        results[key] = key === 'popularServices' ? [] : 0;
      } else {
        results[key] = key === 'popularServices' ? result : result.count || result.total || 0;
      }
      
      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json(results);
      }
    });
  });
});

// Obtener horarios especiales
router.get('/special-schedules', (req, res) => {
  const { startDate, endDate } = req.query;
  const db = getDatabase();
  
  let query = 'SELECT * FROM special_schedules WHERE 1=1';
  const params = [];
  
  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  
  query += ' ORDER BY date';
  
  db.all(query, params, (err, schedules) => {
    if (err) {
      console.error('Error al obtener horarios especiales:', err);
      return res.status(500).json({ error: 'Error al obtener horarios especiales' });
    }
    
    res.json(schedules);
  });
});

// Crear horario especial
router.post('/special-schedules', [
  authenticateToken,
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('is_closed').isBoolean().withMessage('is_closed debe ser booleano')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { date, is_closed, open_time, close_time, notes } = req.body;
  const db = getDatabase();
  
  db.run(
    'INSERT INTO special_schedules (date, is_closed, open_time, close_time, notes) VALUES (?, ?, ?, ?, ?)',
    [date, is_closed, open_time || null, close_time || null, notes || null],
    function(err) {
      if (err) {
        console.error('Error al crear horario especial:', err);
        return res.status(500).json({ error: 'Error al crear horario especial' });
      }
      
      res.status(201).json({
        message: 'Horario especial creado exitosamente',
        scheduleId: this.lastID
      });
    }
  );
});

// Eliminar horario especial
router.delete('/special-schedules/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM special_schedules WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar horario especial' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Horario especial no encontrado' });
    }
    
    res.json({ message: 'Horario especial eliminado exitosamente' });
  });
});

module.exports = router;
