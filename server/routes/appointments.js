const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../database/init');
const { authenticateToken } = require('./auth');
const moment = require('moment');

const router = express.Router();

// Obtener todos los turnos (admin)
router.get('/', authenticateToken, async (req, res) => {
  const { date, status, page = 1, limit = 20 } = req.query;
  const pool = getPool();

  try {
    let query = `
      SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        TIME (a.appointment_time) AS qwer, 
        a.appointment_time ,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price,
        b.name as barber_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.idclients
      JOIN services s ON a.service_id = s.idservices
      LEFT JOIN barbers b ON a.barber_id = b.idbarbers
      WHERE a.barbershop_id = ?
    `;

    const params = [req.user.barbershop_id];

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
    const offset = (page - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [appointments] = await pool.execute(query, params);
    res.json(appointments);
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
});

// Obtener turnos disponibles para una fecha
router.get('/available', async (req, res) => {
  const { date, serviceId, barbershopId = 1 } = req.query;

  if (!date || !serviceId) {
    return res.status(400).json({ error: 'Fecha y ID de servicio son requeridos' });
  }

  const pool = getPool();

  try {
    // Obtener configuración del negocio
    const [configRows] = await pool.execute(
      'SELECT * FROM barbershops WHERE idbarbershops = ?',
      [barbershopId]
    );

    if (configRows.length === 0) {
      return res.status(404).json({ error: 'Barbería no encontrada' });
    }

    const config = configRows[0];

    // Obtener duración del servicio
    const [serviceRows] = await pool.execute(
      'SELECT duration FROM services WHERE idservices = ? AND is_active = 1 AND barbershop_id = ?',
      [serviceId, barbershopId]
    );

    if (serviceRows.length === 0) {
      return res.status(400).json({ error: 'Servicio no encontrado' });
    }

    const service = serviceRows[0];

    // Obtener turnos ocupados para esa fecha
    const [occupiedSlots] = await pool.execute(
      'SELECT a.appointment_time, s.duration FROM appointments a JOIN services s ON a.service_id = s.idservices WHERE a.appointment_date = ? AND a.barbershop_id = ? AND a.status IN ("pending", "confirmed")',
      [date, barbershopId]
    );

    // Generar slots disponibles
    const availableSlots = generateAvailableSlots(
      config.open_time,
      config.close_time,
      config.slot_duration,
      service.duration,
      occupiedSlots
    );

    res.json({ availableSlots });
  } catch (error) {
    console.error('Error al obtener slots disponibles:', error);
    res.status(500).json({ error: 'Error al obtener slots disponibles' });
  }
});

// Crear nuevo turno
router.post('/', [
  body('clientName').notEmpty().withMessage('Nombre del cliente es requerido'),
  body('clientPhone').notEmpty().withMessage('Teléfono del cliente es requerido'),
  body('serviceId').isInt().withMessage('ID de servicio inválido'),
  body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { clientName, clientPhone, clientEmail, serviceId, appointmentDate, appointmentTime, notes, barbershopId = 1, barberId } = req.body;
  const pool = getPool();

  try {
    // Verificar que el slot esté disponible
    const [existingRows] = await pool.execute(
      'SELECT idappointments FROM appointments WHERE appointment_date = ? AND appointment_time = ? AND barbershop_id = ? AND status IN ("pending", "confirmed")',
      [appointmentDate, appointmentTime, barbershopId]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'El horario seleccionado no está disponible' });
    }

    // Buscar o crear cliente
    const [clientRows] = await pool.execute(
      'SELECT idclients FROM clients WHERE phone = ? AND barbershop_id = ?',
      [clientPhone, barbershopId]
    );

    let clientId;
    if (clientRows.length > 0) {
      clientId = clientRows[0].idclients;
      // Actualizar datos del cliente si es necesario
      await pool.execute(
        'UPDATE clients SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE idclients = ?',
        [clientName, clientEmail || null, clientId]
      );
    } else {
      // Crear nuevo cliente
      const [clientResult] = await pool.execute(
        'INSERT INTO clients (barbershop_id, name, phone, email) VALUES (?, ?, ?, ?)',
        [barbershopId, clientName, clientPhone, clientEmail || null]
      );
      clientId = clientResult.insertId;
    }

    // Crear turno
    const [appointmentResult] = await pool.execute(
      'INSERT INTO appointments (client_id, service_id, barbershop_id, barber_id, appointment_date, appointment_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [clientId, serviceId, barbershopId, barberId || null, appointmentDate, appointmentTime, notes || null]
    );

    res.status(201).json({
      message: 'Turno creado exitosamente',
      appointmentId: appointmentResult.insertId
    });
  } catch (error) {
    console.error('Error al crear turno:', error);
    res.status(500).json({ error: 'Error al crear turno' });
  }
});

// Actualizar estado de turno
router.put('/:id/status', [
  authenticateToken,
  body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Estado inválido')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;
  const pool = getPool();

  try {
    const [result] = await pool.execute(
      'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE idappointments = ? AND barbershop_id = ?',
      [status, id, req.user.barbershop_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Estado del turno actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar turno:', error);
    res.status(500).json({ error: 'Error al actualizar turno' });
  }
});

// Obtener turno por ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [rows] = await pool.execute(
      `SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        TIME (a.appointment_time),
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price,
        b.name as barber_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.idclients
      JOIN services s ON a.service_id = s.idservices
      LEFT JOIN barbers b ON a.barber_id = b.idbarbers
      WHERE a.idappointments = ? AND a.barbershop_id = ?`,
      [id, req.user.barbershop_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener turno:', error);
    res.status(500).json({ error: 'Error al obtener turno' });
  }
});

// Eliminar turno
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();

  try {
    const [result] = await pool.execute(
      'DELETE FROM appointments WHERE idappointments = ? AND barbershop_id = ?',
      [id, req.user.barbershop_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Turno eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar turno:', error);
    res.status(500).json({ error: 'Error al eliminar turno' });
  }
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
