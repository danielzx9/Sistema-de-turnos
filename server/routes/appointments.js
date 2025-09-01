const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');
const moment = require('moment');

const router = express.Router();

// Obtener todos los turnos (admin)
router.get('/', authenticateToken, (req, res) => {
  const { date, status, page = 1, limit = 20 } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT 
      a.*,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (date) {
    query += ' AND a.appointment_date = ?';
    params.push(date);
  }
  
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';
  
  // Paginación
  const offset = (page - 1) * limit;
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, appointments) => {
    if (err) {
      console.error('Error al obtener turnos:', err);
      return res.status(500).json({ error: 'Error al obtener turnos' });
    }
    
    res.json(appointments);
  });
});

// Obtener turnos disponibles para una fecha
router.get('/available', (req, res) => {
  const { date, serviceId } = req.query;
  
  if (!date || !serviceId) {
    return res.status(400).json({ error: 'Fecha y ID de servicio son requeridos' });
  }
  
  const db = getDatabase();
  
  // Obtener configuración del negocio
  db.get('SELECT * FROM business_config LIMIT 1', (err, config) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener configuración' });
    }
    
    // Obtener duración del servicio
    db.get('SELECT duration FROM services WHERE id = ? AND is_active = 1', [serviceId], (err, service) => {
      if (err || !service) {
        return res.status(400).json({ error: 'Servicio no encontrado' });
      }
      
      // Obtener turnos ocupados para esa fecha
      db.all(
        'SELECT appointment_time, duration FROM appointments a JOIN services s ON a.service_id = s.id WHERE appointment_date = ? AND status IN ("pending", "confirmed")',
        [date],
        (err, occupiedSlots) => {
          if (err) {
            return res.status(500).json({ error: 'Error al obtener turnos ocupados' });
          }
          
          // Generar slots disponibles
          const availableSlots = generateAvailableSlots(
            config.open_time,
            config.close_time,
            config.slot_duration,
            service.duration,
            occupiedSlots
          );
          
          res.json({ availableSlots });
        }
      );
    });
  });
});

// Crear nuevo turno
router.post('/', [
  body('clientName').notEmpty().withMessage('Nombre del cliente es requerido'),
  body('clientPhone').notEmpty().withMessage('Teléfono del cliente es requerido'),
  body('serviceId').isInt().withMessage('ID de servicio inválido'),
  body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { clientName, clientPhone, clientEmail, serviceId, appointmentDate, appointmentTime, notes } = req.body;
  const db = getDatabase();
  
  // Verificar que el slot esté disponible
  db.get(
    'SELECT id FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND status IN ("pending", "confirmed")',
    [appointmentDate, appointmentTime],
    (err, existingAppointment) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar disponibilidad' });
      }
      
      if (existingAppointment) {
        return res.status(400).json({ error: 'El horario seleccionado no está disponible' });
      }
      
      // Buscar o crear cliente
      db.get(
        'SELECT id FROM clients WHERE phone = ?',
        [clientPhone],
        (err, client) => {
          if (err) {
            return res.status(500).json({ error: 'Error al buscar cliente' });
          }
          
          let clientId;
          if (client) {
            clientId = client.id;
            // Actualizar datos del cliente si es necesario
            db.run(
              'UPDATE clients SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [clientName, clientEmail || null, clientId]
            );
          } else {
            // Crear nuevo cliente
            db.run(
              'INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)',
              [clientName, clientPhone, clientEmail || null],
              function(err) {
                if (err) {
                  return res.status(500).json({ error: 'Error al crear cliente' });
                }
                clientId = this.lastID;
                createAppointment();
              }
            );
            return;
          }
          
          createAppointment();
          
          function createAppointment() {
            // Crear turno
            db.run(
              'INSERT INTO appointments (client_id, service_id, appointment_date, appointment_time, notes) VALUES (?, ?, ?, ?, ?)',
              [clientId, serviceId, appointmentDate, appointmentTime, notes || null],
              function(err) {
                if (err) {
                  console.error('Error al crear turno:', err);
                  return res.status(500).json({ error: 'Error al crear turno' });
                }
                
                res.status(201).json({
                  message: 'Turno creado exitosamente',
                  appointmentId: this.lastID
                });
              }
            );
          }
        }
      );
    }
  );
});

// Actualizar estado de turno
router.put('/:id/status', [
  authenticateToken,
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Estado inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { status } = req.body;
  const db = getDatabase();
  
  db.run(
    'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al actualizar turno' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }
      
      res.json({ message: 'Estado del turno actualizado exitosamente' });
    }
  );
});

// Obtener turno por ID
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get(
    `SELECT 
      a.*,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ?`,
    [id],
    (err, appointment) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener turno' });
      }
      
      if (!appointment) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }
      
      res.json(appointment);
    }
  );
});

// Eliminar turno
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM appointments WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar turno' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    
    res.json({ message: 'Turno eliminado exitosamente' });
  });
});

// Función para generar slots disponibles
function generateAvailableSlots(openTime, closeTime, slotDuration, serviceDuration, occupiedSlots) {
  const slots = [];
  const open = moment(openTime, 'HH:mm');
  const close = moment(closeTime, 'HH:mm');
  
  // Convertir slots ocupados a momentos
  const occupied = occupiedSlots.map(slot => ({
    start: moment(slot.appointment_time, 'HH:mm'),
    end: moment(slot.appointment_time, 'HH:mm').add(slot.duration, 'minutes')
  }));
  
  let current = open.clone();
  
  while (current.add(serviceDuration, 'minutes').isSameOrBefore(close)) {
    const slotStart = current.clone().subtract(serviceDuration, 'minutes');
    const slotEnd = current.clone();
    
    // Verificar si el slot está ocupado
    const isOccupied = occupied.some(occ => 
      slotStart.isBefore(occ.end) && slotEnd.isAfter(occ.start)
    );
    
    if (!isOccupied) {
      slots.push({
        time: slotStart.format('HH:mm'),
        available: true
      });
    }
    
    current.add(slotDuration, 'minutes');
  }
  
  return slots;
}

module.exports = router;
