const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Business = require('../models/Business');
const Client = require('../models/Client');
const BotNumberService = require('../services/BotNumberService');
const moment = require('moment');

class AppointmentController {
  static async getAll(req, res) {
    const { date, status, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (date) filters.date = date;
    if (status) filters.status = status;
    if (limit) {
      filters.limit = parseInt(limit);
      filters.offset = (page - 1) * parseInt(limit);
    }

    try {
      const appointments = await Appointment.findAll(req.user.barbershop_id, filters);
      res.json(appointments);
    } catch (error) {
      console.error('Error al obtener turnos:', error);
      res.status(500).json({ error: 'Error al obtener turnos' });
    }
  }

  static async getAvailableSlots(req, res) {
    const botNumber = BotNumberService.getBotNumber();
    const barbershops = await Appointment.findBybotNumber(botNumber);
    const idbarbershops = barbershops.idbarbershops;
    const { date, serviceId, barbershopId = idbarbershops } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({ error: 'Fecha y ID de servicio son requeridos' });
    }

    try {
      const config = await Business.findById(barbershopId);
      if (!config) {
        return res.status(404).json({ error: 'Barbería no encontrada' });
      }

      const service = await Service.findById(serviceId, barbershopId);
      if (!service) {
        return res.status(400).json({ error: 'Servicio no encontrado' });
      }

      const occupiedSlots = await Appointment.findOccupiedSlots(date, barbershopId);
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
  }
  static async isSlotAvailable(appointmentDate, appointmentTime, barbershopId) {
    // Check if slot is available
    const existing = await Appointment.findOccupiedSlots(appointmentDate, appointmentTime, barbershopId);
    return !existing;
  }

  static async create({ clientName, clientPhone, clientEmail, serviceId, appointmentDate, appointmentTime, notes, barbershopId, barberId }) {
    try {
      // Find or create client
      let client = await Client.findByPhone(clientPhone, barbershopId);
      let clientId;
      if (client) {
        clientId = client.id;
        await Client.update(clientId, { name: clientName, email: clientEmail });
      } else {
        clientId = await Client.create({
          barbershop_id: barbershopId,
          name: clientName,
          phone: clientPhone,
          email: clientEmail
        });
      }

      // Create appointment
      return Appointment.create({
        client_id: clientId,
        service_id: serviceId,
        barbershop_id: barbershopId,
        barber_id: barberId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes
      });
    } catch (error) {
      console.error('Error al crear turno:', error);
      res.status(500).json({ error: 'Error al crear turno' });
    }
  }

  static async updateStatus(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    try {
      const success = await Appointment.updateStatus(id, status, req.user.barbershop_id);
      if (!success) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json({ message: 'Estado del turno actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar turno:', error);
      res.status(500).json({ error: 'Error al actualizar turno' });
    }
  }

  static async getById(req, res) {
    const { id } = req.params;

    try {
      const appointment = await Appointment.findById(id, req.user.barbershop_id);
      if (!appointment) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json(appointment);
    } catch (error) {
      console.error('Error al obtener turno:', error);
      res.status(500).json({ error: 'Error al obtener turno' });
    }
  }

  static async delete(req, res) {
    const { id } = req.params;

    try {
      const success = await Appointment.delete(id, req.user.barbershop_id);
      if (!success) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      res.json({ message: 'Turno eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar turno:', error);
      res.status(500).json({ error: 'Error al eliminar turno' });
    }
  }
}

// Helper function
function generateAvailableSlots(openTime, closeTime, slotDuration, serviceDuration, occupiedSlots) {
  const slots = [];
  const open = moment(openTime, 'HH:mm');
  const close = moment(closeTime, 'HH:mm');

  const occupied = occupiedSlots.map(slot => ({
    start: moment(slot.appointment_time, 'HH:mm'),
    end: moment(slot.appointment_time, 'HH:mm').add(slot.duration, 'minutes')
  }));

  let current = open.clone();

  while (current.add(serviceDuration, 'minutes').isSameOrBefore(close)) {
    const slotStart = current.clone().subtract(serviceDuration, 'minutes');
    const slotEnd = current.clone();

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

module.exports = AppointmentController;