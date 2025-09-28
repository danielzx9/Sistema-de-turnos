// Gestor de conversaciones para WhatsApp
const { getPool } = require('../database/init');
const AppointmentController = require('../controllers/AppointmentController');
const Appointment = require('../models/Appointment');
const BotNumberService = require('../services/BotNumberService')

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

// REVISAR SI YA TIENE TURNOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
  async checkExistingAppointment(clientId) {
    const hasPending = await Appointment.findByIdClient(clientId);
  
    if (hasPending) {
      return {
        action: 'send_message',
        message: '⚠️ Ya tienes un turno pendiente.\n\nPor favor finaliza o cancela ese turno antes de solicitar otro.'
      };
    }
  
    // Si no tiene turno pendiente, seguimos normal
    return null;
  }

  // Procesar respuesta del usuario
  async processUserResponse(phoneNumber, message, botNumberId) {
    const state = this.getConversationState(phoneNumber);

    if (!state || this.isConversationExpired(phoneNumber)) {
      this.clearConversation(phoneNumber);
      return { action: 'restart', message: 'La conversación ha expirado. Escribe "RESERVAR" para empezar de nuevo.' };
    }

    switch (state.step) {
      case 'select_service':
        return await this.handleServiceSelection(phoneNumber, message, botNumberId);

      case 'select_date':
        return await this.handleDateSelection(phoneNumber, message);

      case 'select_time':
        return await this.handleTimeSelection(phoneNumber, message, botNumberId);

      /*case 'confirm_name':
        return await this.handleNameConfirmation(phoneNumber, message);

      case 'confirm_phone':
        return await this.handlePhoneConfirmation(phoneNumber, message);*/

      case 'final_confirmation':
        return await this.handleFinalConfirmation(phoneNumber, message, botNumberId);

      default:
        this.clearConversation(phoneNumber);
        return { action: 'restart', message: 'Error en el proceso. Escribe "RESERVAR" para empezar de nuevo.' };
    }
  }

  // Manejar selección de servicio
  async handleServiceSelection(phoneNumber, message, botNumberId) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM barbershops WHERE business_phone = ? LIMIT 1',
        [botNumberId]
      );

      const numberBarber = rows[0]; // primer resultado del array

      const [services] = await pool.execute(
        'SELECT * FROM services WHERE is_active = 1 AND barbershop_id = ? ORDER BY name',
        [numberBarber.idbarbershops]
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
  async handleTimeSelection(phoneNumber, message, botNumberId) {
    const state = this.getConversationState(phoneNumber);
    const pool = getPool();

    console.log(state);
    const botNumber = BotNumberService.getBotNumber();
    const barbershops = await Appointment.findBybotNumber(botNumber);
    const idbarbershops = barbershops.idbarbershops;
    try {
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
      const [configRows] = await pool.execute(
        'SELECT * FROM barbershops WHERE idbarbershops = ?',
        [idbarbershops]
      );

      if (configRows.length === 0) {
        throw new Error('Configuración no encontrada');
      }

      const config = configRows[0];

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
      const isAvailable = await AppointmentController.isSlotAvailable(dateStr, message, idbarbershops);

      if (!isAvailable) {
        return {
          action: 'send_message',
          message: `❌ *Horario no disponible*\n\nEl horario ${message} no está disponible para el ${dateStr}.`
        };
      }
      this.setConversationState(phoneNumber, {
        step: 'final_confirmation',
        data: { ...state.data, time: message }
      });

      const newState = this.getConversationState(phoneNumber);
      const dateStr2 = newState.data.date.toLocaleDateString('es-ES');
      const horaStr = newState.data.time;

      return {
        action: 'send_message',
        message: `📋 *Resumen de tu reserva:*\n\n*Servicio:* ${state.data.service.name}\n*Fecha:* ${dateStr2}\n*Hora:* ${horaStr}\n*Teléfono:* ${phoneNumber}\n*Precio:* $${state.data.service.price}\n\n¿Confirmas esta reserva?\n\nEscribe:\n• "SI" para confirmar\n• "NO" para cancelar`
      };
    } catch (error) {
      console.error('Error al validar horario:', error);
      this.clearConversation(phoneNumber);
      return { action: 'restart', message: 'Error al validar horario. Por favor, contáctanos directamente.' };
    }
  }

  // Manejar confirmación final
  async handleFinalConfirmation(phoneNumber, message) {
    const state = this.getConversationState(phoneNumber);
    const botNumber = BotNumberService.getBotNumber();
    const barbershops = await Appointment.findBybotNumber(botNumber);
    const idbarbershops = barbershops.idbarbershops;
    if (message.toLowerCase() === 'si' || message.toLowerCase() === 'sí') {
      try {
        const dateISO = state.data.date.toISOString().split('T')[0];
        const timeStr = state.data.time;
        const appointmentDateTime = `${dateISO} ${timeStr}:00`;
        // Crear la reserva en la base de datos
        await AppointmentController.create({
          clientName: phoneNumber,
          clientPhone: phoneNumber,
          clientEmail: null,
          serviceId: state.data.service.idservices,
          appointmentDate: dateISO,
          appointmentTime: appointmentDateTime,
          notes: '',
          barbershopId: idbarbershops,
          barberId: state.data.barberId || null
        });

        this.clearConversation(phoneNumber);

        return {
          action: 'send_message',
          message: `🎉 *¡Reserva Confirmada!*\n\nTu turno ha sido reservado exitosamente:\n\n*Servicio:* ${state.data.service.name}\n*Fecha:* ${state.data.date.toLocaleDateString('es-ES')}\n*Hora:* ${timeStr}\n*Precio:* $${state.data.service.price}\n\nTe enviaremos una confirmación por WhatsApp.\n\n¡Te esperamos! 😊`
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
}

module.exports = new ConversationManager();
