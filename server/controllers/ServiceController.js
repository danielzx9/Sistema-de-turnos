const { validationResult } = require('express-validator');
const Service = require('../models/Service');

class ServiceController {
  static async getAll(req, res) {
    const { barbershopId = 1 } = req.query;

    try {
      const services = await Service.findActiveByBarbershopId(barbershopId);
      res.json(services);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      res.status(500).json({ error: 'Error al obtener servicios' });
    }
  }

  static async getAllAdmin(req, res) {
    try {
      const services = await Service.findAll(req.user.barbershop_id, true);
      res.json(services);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      res.status(500).json({ error: 'Error al obtener servicios' });
    }
  }

  static async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, duration, price } = req.body;

    try {
      const serviceId = await Service.create({
        barbershop_id: req.user.barbershop_id,
        name,
        description,
        duration,
        price
      });

      res.status(201).json({
        message: 'Servicio creado exitosamente',
        serviceId
      });
    } catch (error) {
      console.error('Error al crear servicio:', error);
      res.status(500).json({ error: 'Error al crear servicio' });
    }
  }

  static async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, duration, price, is_active } = req.body;

    try {
      const success = await Service.update(id, { name, description, duration, price, is_active }, req.user.barbershop_id);
      if (!success) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      res.json({ message: 'Servicio actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      res.status(500).json({ error: 'Error al actualizar servicio' });
    }
  }

  static async deactivate(req, res) {
    const { id } = req.params;

    try {
      const hasPending = await Service.hasPendingAppointments(id, req.user.barbershop_id);
      if (hasPending) {
        return res.status(400).json({
          error: 'No se puede desactivar el servicio porque tiene turnos pendientes.'
        });
      }

      const success = await Service.deactivate(id, req.user.barbershop_id);
      if (!success) {
        return res.status(404).json({ error: 'Servicio no encontrado.' });
      }

      res.json({ message: 'Servicio desactivado exitosamente.' });
    } catch (error) {
      console.error('Error al desactivar servicio:', error);
      res.status(500).json({ error: 'Error al desactivar servicio.' });
    }
  }

  static async delete(req, res) {
    const { id } = req.params;

    try {
      const hasAppointments = await Service.hasAnyAppointments(id, req.user.barbershop_id);
      if (hasAppointments) {
        return res.status(400).json({
          error: 'No se puede eliminar permanentemente el servicio porque tiene historial de turnos.'
        });
      }

      const success = await Service.delete(id, req.user.barbershop_id);
      if (!success) {
        return res.status(404).json({ error: 'Servicio no encontrado.' });
      }

      res.json({ message: 'Servicio eliminado permanentemente.' });
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      res.status(500).json({ error: 'Error al eliminar servicio permanentemente.' });
    }
  }

  static async getById(req, res) {
    const { id } = req.params;
    const { barbershopId = 1 } = req.query;

    try {
      const service = await Service.findById(id, barbershopId);
      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      res.json(service);
    } catch (error) {
      console.error('Error al obtener servicio:', error);
      res.status(500).json({ error: 'Error al obtener servicio' });
    }
  }
}

module.exports = ServiceController;