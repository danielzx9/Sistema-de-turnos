const { validationResult } = require('express-validator');
const Business = require('../models/Business');
const SpecialSchedule = require('../models/SpecialSchedule');

class BusinessController {
  static async getConfig(req, res) {
    try {
      const config = await Business.findById(req.user.barbershop_id);
      if (!config) {
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }

      res.json(config);
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      res.status(500).json({ error: 'Error al obtener configuración' });
    }
  }

  static async updateConfig(req, res) {
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

    try {
      const success = await Business.update(req.user.barbershop_id, {
        business_name,
        business_phone,
        business_address,
        business_email,
        open_time,
        close_time,
        slot_duration,
        working_days
      });

      if (!success) {
        return res.status(404).json({ error: 'Barbería no encontrada' });
      }

      res.json({ message: 'Configuración actualizada exitosamente' });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }

  static async getStats(req, res) {
    const { startDate, endDate } = req.query;

    try {
      const stats = await Business.getStats(req.user.barbershop_id, { startDate, endDate });
      res.json(stats);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  }

  static async getSpecialSchedules(req, res) {
    const { startDate, endDate, barbershopId = 1 } = req.query;

    try {
      const schedules = await SpecialSchedule.findAll(barbershopId, { startDate, endDate });
      res.json(schedules);
    } catch (error) {
      console.error('Error al obtener horarios especiales:', error);
      res.status(500).json({ error: 'Error al obtener horarios especiales' });
    }
  }

  static async createSpecialSchedule(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, is_closed, open_time, close_time, notes } = req.body;

    try {
      const scheduleId = await SpecialSchedule.create({
        barbershop_id: req.user.barbershop_id,
        date,
        is_closed,
        open_time,
        close_time,
        notes
      });

      res.status(201).json({
        message: 'Horario especial creado exitosamente',
        scheduleId
      });
    } catch (error) {
      console.error('Error al crear horario especial:', error);
      res.status(500).json({ error: 'Error al crear horario especial' });
    }
  }

  static async deleteSpecialSchedule(req, res) {
    const { id } = req.params;

    try {
      const success = await SpecialSchedule.delete(id, req.user.barbershop_id);
      if (!success) {
        return res.status(404).json({ error: 'Horario especial no encontrado' });
      }

      res.json({ message: 'Horario especial eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar horario especial:', error);
      res.status(500).json({ error: 'Error al eliminar horario especial' });
    }
  }
}

module.exports = BusinessController;