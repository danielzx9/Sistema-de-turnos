// Gestor de conversaciones para WhatsApp
const { getPool } = require('../database/init');

class ConversationManager {
  constructor() {
    this.conversations = new Map(); // phoneNumber -> conversationState
  }

  // Estados de conversación
  getConversationState(phoneNumber) {
    return this.conversations.get(phoneNumber) || null;
  }

  setConversationState(phoneNumber, state) {
    this.conversations.set(phoneNumber, {
      ...state,
      timestamp: Date.now()
    });
  }

  clearConversation(phoneNumber) {
    this.conversations.delete(phoneNumber);
  }

  // Verificar si la conversación ha expirado (5 minutos)
  isConversationExpired(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    if (!state) return true;
    
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos en milisegundos
    return (Date.now() - state.timestamp) > fiveMinutes;
  }

  // Iniciar proceso de reserva
  startReservation(phoneNumber) {
    this.setConversationState(phoneNumber, {
      step: 'select_service',
      data: {}
    });
  }

  // Procesar respuesta del usuario
  async processUserResponse(phoneNumber, message) {
    const state = this.getConversationState(phoneNumber);
    
    if (!state || this.isConversationExpired(phoneNumber)) {
      this.clearConversation(phoneNumber);
      return { action: 'restart', message: 'La conversación ha expirado. Escribe "RESERVAR" para empezar de nuevo.' };
    }

    switch (state.step) {
      case 'select_service':
        return await this.handleServiceSelection(phoneNumber, message);
      
      case 'select_date':
        return await this.handleDateSelection(phoneNumber, message);
      
      case 'select_time':
        return await this.handleTimeSelection(phoneNumber, message);
      
      case 'confirm_name':
        return await this.handleNameConfirmation(phoneNumber, message);
      
      case 'confirm_phone':
        return await this.handlePhoneConfirmation(phoneNumber, message);
      
      case 'final_confirmation':
        return await this.handleFinalConfirmation(phoneNumber, message);
      
      default:
        this.clearConversation(phoneNumber);
        return { action: 'restart', message: 'Error en el proceso. Escribe "RESERVAR" para empezar de nuevo.' };
    }
  }

  // Manejar selección de servicio
  async handleServiceSelection(phoneNumber, message) {
    const pool = getPool();

    try {
      const [services] = await pool.execute(
        'SELECT * FROM services WHERE is_active = 1 AND barbershop_id = 1 ORDER BY name'
      );

      const selectedNumber = parseInt(message);
      if (selectedNumber >= 1 && selectedNumber <= services.length) {
        const selectedService = services[selectedNumber - 1];
        
        this.setConversationState(phoneNumber, {
          step: 'select_date',
          data: { ...this.getConversationState(phoneNumber).data, service: selectedService }
        });

        return {
          action: 'send_message',
          message: `✅ *Servicio seleccionado:* ${selectedService.name}\n\n📅 *¿Para qué fecha quieres el turno?*\n\nEscribe la fecha en formato DD/MM/AAAA\n\n*Ejemplos:*\n• 15/09/2024\n• 20/09/2024\n• mañana\n• pasado mañana`
        };
      } else {
        let serviceList = '*Servicios disponibles:*\n\n';
        services.forEach((service, index) => {
          serviceList += `${index + 1}. ${service.name} - $${service.price} (${service.duration} min)\n`;
        });
        serviceList += '\n*Escribe el número del servicio que deseas:*';

        return {
          action: 'send_message',
          message: serviceList
        };
      }
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      this.clearConversation(phoneNumber);
      return { action: 'restart', message: 'Error al obtener servicios. Por favor, contáctanos directamente.' };
    }
  }

  // Manejar selección de fecha
  async handleDateSelection(phoneNumber, message) {
    const state = this.getConversationState(phoneNumber);
    const today = new Date();
    
    let selectedDate;
    
    // Procesar diferentes formatos de fecha
    if (message.toLowerCase().includes('mañana')) {
      selectedDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (message.toLowerCase().includes('pasado mañana')) {
      selectedDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    } else {
      // Intentar parsear fecha DD/MM/AAAA
      const parts = message.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Meses van de 0-11
        const year = parseInt(parts[2]);
        selectedDate = new Date(year, month, day);
      }
    }

    if (!selectedDate || selectedDate < today) {
      return {
        action: 'send_message',
        message: '❌ *Fecha inválida*\n\nPor favor, escribe una fecha válida:\n• DD/MM/AAAA (ej: 15/09/2024)\n• mañana\n• pasado mañana'
      };
    }

    // Verificar que sea día laboral (lunes a viernes)
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = domingo, 6 = sábado
      return {
        action: 'send_message',
        message: '❌ *No atendemos los fines de semana*\n\nPor favor, selecciona un día de lunes a viernes.'
      };
    }

    this.setConversationState(phoneNumber, {
      step: 'select_time',
      data: { ...state.data, date: selectedDate }
    });

    return {
      action: 'send_message',
      message: `✅ *Fecha seleccionada:* ${selectedDate.toLocaleDateString('es-ES')}\n\n🕐 *¿A qué hora quieres el turno?*\n\nEscribe la hora en formato HH:MM\n\n*Ejemplos:*\n• 10:00\n• 14:30\n• 16:00`
    };
  }

  // Manejar selección de hora
  async handleTimeSelection(phoneNumber, message) {
    const state = this.getConversationState(phoneNumber);
    const pool = getPool();

    try {
      // Obtener configuración del negocio
      const [configRows] = await pool.execute(
        'SELECT * FROM barbershops WHERE idbarbershops = 1'
      );

      if (configRows.length === 0) {
        throw new Error('Configuración no encontrada');
      }

      const config = configRows[0];

      // Validar formato de hora
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(message)) {
        return {
          action: 'send_message',
          message: '❌ *Formato de hora inválido*\n\nPor favor, escribe la hora en formato HH:MM\n\n*Ejemplos:*\n• 10:00\n• 14:30\n• 16:00'
        };
      }

      const [hours, minutes] = message.split(':').map(Number);
      const selectedTime = new Date(state.data.date);
      selectedTime.setHours(hours, minutes, 0, 0);

      // Verificar que esté dentro del horario de atención
      const [openHour, openMin] = config.open_time.split(':').map(Number);
      const [closeHour, closeMin] = config.close_time.split(':').map(Number);
      
      const openTime = new Date(state.data.date);
      openTime.setHours(openHour, openMin, 0, 0);
      
      const closeTime = new Date(state.data.date);
      closeTime.setHours(closeHour, closeMin, 0, 0);

      if (selectedTime < openTime || selectedTime > closeTime) {
        return {
          action: 'send_message',
          message: `❌ *Horario fuera de atención*\n\nNuestros horarios son:\n🕐 ${config.open_time} - ${config.close_time}\n\nPor favor, selecciona una hora dentro de este horario.`
        };
      }

      // Verificar disponibilidad
      const dateStr = state.data.date.toISOString().split('T')[0];
      const availableSlots = await this.getAvailableSlots(dateStr, state.data.service.id);
      
      const isAvailable = availableSlots.some(slot => slot.time === message);
      
      if (!isAvailable) {
        return {
          action: 'send_message',
          message: `❌ *Horario no disponible*\n\nEl horario ${message} no está disponible para el ${dateStr}.\n\n*Horarios disponibles:*\n${availableSlots.slice(0, 5).map(slot => `• ${slot.time}`).join('\n')}\n\nPor favor, selecciona uno de estos horarios.`
        };
      }

      this.setConversationState(phoneNumber, {
        step: 'confirm_name',
        data: { ...state.data, time: message }
      });

      return {
        action: 'send_message',
        message: `✅ *Horario seleccionado:* ${message}\n\n👤 *¿Cuál es tu nombre completo?*\n\nEscribe tu nombre y apellido:`
      };
    } catch (error) {
      console.error('Error al validar horario:', error);
      this.clearConversation(phoneNumber);
      return { action: 'restart', message: 'Error al validar horario. Por favor, contáctanos directamente.' };
    }
  }

  // Manejar confirmación de nombre
  async handleNameConfirmation(phoneNumber, message) {
    if (message.length < 3) {
      return {
        action: 'send_message',
        message: '❌ *Nombre muy corto*\n\nPor favor, escribe tu nombre completo (nombre y apellido):'
      };
    }

    const state = this.getConversationState(phoneNumber);
    this.setConversationState(phoneNumber, {
      step: 'confirm_phone',
      data: { ...state.data, name: message }
    });

    return {
      action: 'send_message',
      message: `✅ *Nombre:* ${message}\n\n📱 *¿Cuál es tu número de teléfono?*\n\nEscribe tu número (incluyendo código de país):\n\n*Ejemplo:* +1234567890`
    };
  }

  // Manejar confirmación de teléfono
  async handlePhoneConfirmation(phoneNumber, message) {
    const phoneRegex = /^[+]?[\d\s-()]+$/;
    if (!phoneRegex.test(message)) {
      return {
        action: 'send_message',
        message: '❌ *Formato de teléfono inválido*\n\nPor favor, escribe tu número de teléfono:\n\n*Ejemplo:* +1234567890'
      };
    }

    const state = this.getConversationState(phoneNumber);
    this.setConversationState(phoneNumber, {
      step: 'final_confirmation',
      data: { ...state.data, phone: message }
    });

    const dateStr = state.data.date.toLocaleDateString('es-ES');
    
    return {
      action: 'send_message',
      message: `📋 *Resumen de tu reserva:*\n\n*Servicio:* ${state.data.service.name}\n*Fecha:* ${dateStr}\n*Hora:* ${state.data.time}\n*Nombre:* ${state.data.name}\n*Teléfono:* ${state.data.phone}\n*Precio:* $${state.data.service.price}\n\n¿Confirmas esta reserva?\n\nEscribe:\n• "SI" para confirmar\n• "NO" para cancelar`
    };
  }

  // Manejar confirmación final
  async handleFinalConfirmation(phoneNumber, message) {
    const state = this.getConversationState(phoneNumber);
    
    if (message.toLowerCase() === 'si' || message.toLowerCase() === 'sí') {
      try {
        // Crear la reserva en la base de datos
        const result = await this.createAppointment(state.data);
        
        this.clearConversation(phoneNumber);
        
        return {
          action: 'send_message',
          message: `🎉 *¡Reserva Confirmada!*\n\nTu turno ha sido reservado exitosamente:\n\n*Servicio:* ${state.data.service.name}\n*Fecha:* ${state.data.date.toLocaleDateString('es-ES')}\n*Hora:* ${state.data.time}\n*Precio:* $${state.data.service.price}\n\nTe enviaremos una confirmación por WhatsApp.\n\n¡Te esperamos! 😊`
        };
      } catch (error) {
        console.error('Error al crear reserva:', error);
        this.clearConversation(phoneNumber);
        return { action: 'restart', message: 'Error al crear la reserva. Por favor, contáctanos directamente.' };
      }
    } else {
      this.clearConversation(phoneNumber);
      return {
        action: 'send_message',
        message: '❌ *Reserva cancelada*\n\nNo se realizó la reserva. Si cambias de opinión, escribe "RESERVAR" para empezar de nuevo.\n\n¡Gracias por tu interés! 😊'
      };
    }
  }

  // Obtener slots disponibles
  async getAvailableSlots(date, serviceId, barbershopId = 1) {
    const pool = getPool();

    try {
      // Obtener configuración del negocio
      const [configRows] = await pool.execute(
        'SELECT * FROM barbershops WHERE idbarbershops = ?',
        [barbershopId]
      );

      if (configRows.length === 0) {
        throw new Error('Configuración no encontrada');
      }

      const config = configRows[0];

      // Obtener duración del servicio
      const [serviceRows] = await pool.execute(
        'SELECT duration FROM services WHERE idservices = ? AND is_active = 1 AND barbershop_id = ?',
        [serviceId, barbershopId]
      );

      if (serviceRows.length === 0) {
        throw new Error('Servicio no encontrado');
      }

      const service = serviceRows[0];

      // Obtener turnos ocupados para esa fecha
      const [occupiedSlots] = await pool.execute(
        'SELECT a.appointment_time, s.duration FROM appointments a JOIN services s ON a.service_id = s.idservices WHERE a.appointment_date = ? AND a.barbershop_id = ? AND a.status IN ("pending", "confirmed")',
        [date, barbershopId]
      );

      // Generar slots disponibles
      const availableSlots = this.generateAvailableSlots(
        config.open_time,
        config.close_time,
        config.slot_duration,
        service.duration,
        occupiedSlots
      );

      return availableSlots;
    } catch (error) {
      throw error;
    }
  }

  // Generar slots disponibles
  generateAvailableSlots(openTime, closeTime, slotDuration, serviceDuration, occupiedSlots) {
    const slots = [];
    const moment = require('moment');

    const open = moment(openTime, 'HH:mm');
    const close = moment(closeTime, 'HH:mm');

    // Convertir slots ocupados a momentos
    const occupied = occupiedSlots.map(slot => ({
      start: moment(slot.appointment_time, 'HH:mm'),
      end: moment(slot.appointment_time, 'HH:mm').add(slot.duration, 'minutes')
    }));

    let current = open.clone();
    while (current.isBefore(close)) {
      const slotStart = current.clone();
      const slotEnd = current.clone().add(serviceDuration, 'minutes');

      // El slot debe terminar antes o justo al cierre
      if (slotEnd.isAfter(close)) {
        break;
      }

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

  // Crear cita en la base de datos
  async createAppointment(data, barbershopId = 1) {
    const pool = getPool();

    try {
      // Buscar o crear cliente
      const [clientRows] = await pool.execute(
        'SELECT idclients FROM clients WHERE phone = ? AND barbershop_id = ?',
        [data.phone, barbershopId]
      );

      let clientId;
      if (clientRows.length > 0) {
        clientId = clientRows[0].idclients;
        // Actualizar datos del cliente
        await pool.execute(
          'UPDATE clients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE idclients = ?',
          [data.name, clientId]
        );
      } else {
        // Crear nuevo cliente
        const [clientResult] = await pool.execute(
          'INSERT INTO clients (barbershop_id, name, phone) VALUES (?, ?, ?)',
          [barbershopId, data.name, data.phone]
        );
        clientId = clientResult.insertId;
      }

      // Crear turno
      const [appointmentResult] = await pool.execute(
        'INSERT INTO appointments (client_id, service_id, barbershop_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?, ?)',
        [clientId, data.service.id, barbershopId, data.date.toISOString().split('T')[0], data.time, 'pending']
      );

      return { appointmentId: appointmentResult.insertId };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ConversationManager();
