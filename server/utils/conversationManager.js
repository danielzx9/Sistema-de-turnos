// Gestor de conversaciones para WhatsApp
const { getPool } = require('../database/init');
const AppointmentController = require('../controllers/AppointmentController');
const Appointment = require('../models/Appointment');
const BotNumberService = require('../services/BotNumberService')

// --- NUEVAS FUNCIONES AUXILIARES ---

/**
 * Convierte un string de tiempo "HH:MM" a minutos desde la medianoche.
 * @param {string} timeStr - Ejemplo: "09:30"
 * @returns {number} - Ejemplo: 570
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convierte minutos desde la medianoche a un string de tiempo "HH:MM".
 * @param {number} totalMinutes - Ejemplo: 570
 * @returns {string} - Ejemplo: "09:30"
 */
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

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

    if (hasPending.length >= 2) {
      return {
        action: 'send_message',
        message: '⚠️ Ya alcanzaste el limite de turnos pendientes a reservar.\n\nPor favor finaliza o cancela un turno antes de solicitar otro.'
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

      //case 'select_time':
      //return await this.handleTimeSelection(phoneNumber, message, botNumberId);

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
          message: `✅ *Servicio seleccionado:* ${selectedService.name}\n\n📅 *Elige el día y la hora para tu turno.*\n\n👉 Escribe el día de la semana seguido de la hora (en formato 24h).\n\n*Ejemplos:*\n• lunes 14:00  → (lunes a las 2:00 p.m.)\n• martes 10:00 → (martes a las 10:00 a.m.)\n• miércoles 18:00 → (miércoles a las 6:00 p.m.)`
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
  //handleDateSelection

  // Manejar selección de fecha y hora en un solo mensaje (ej: "lunes 14:00")
  async handleDateSelection(phoneNumber, message, botNumberId) {
    const state = this.getConversationState(phoneNumber);
    const pool = getPool();
  
    try {
      // ------------------------------------------------------------
      // 1. Extraer día y hora del mensaje (ej: "lunes 14:30")
      // ------------------------------------------------------------
      const regex = /(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+([0-2]?[0-9]:[0-5][0-9])/i;
      const match = message.match(regex);
  
      if (!match) {
        return {
          action: "send_message",
          message: `❌ *Formato inválido*\n\nPor favor escribe el día y hora en este formato:\n\n👉 Ejemplo: \n• lunes 14:00\n• martes 09:30\n• miércoles 16:00`
        };
      }
  
      const diaTexto = match[1].toLowerCase();
      const horaTexto = match[2]; // "14:30"
  
      // ------------------------------------------------------------
      // 2. Calcular la fecha seleccionada según el día mencionado
      // ------------------------------------------------------------
      const diasSemana = {
        "domingo": 0,
        "lunes": 1,
        "martes": 2,
        "miércoles": 3,
        "miercoles": 3,
        "jueves": 4,
        "viernes": 5,
        "sábado": 6,
        "sabado": 6
      };
  
      const today = new Date();
      const todayDay = today.getDay(); // 0-6
      const targetDay = diasSemana[diaTexto];
  
      let selectedDate = new Date(today);
      let diff = targetDay - todayDay;
      if (diff < 0) diff += 7; // siguiente semana si ya pasó el día
      selectedDate.setDate(today.getDate() + diff);
  
      // ------------------------------------------------------------
      // 3. Validar hora y ajustar fecha/hora
      // ------------------------------------------------------------
      const [hours, minutes] = horaTexto.split(":").map(Number);
      selectedDate.setHours(hours, minutes, 0, 0);
  
      // Si es el mismo día, validar que la hora no sea pasada
      if (diff === 0 && selectedDate < today) {
        return {
          action: "send_message",
          message: `❌ *Hora inválida*\n\nYa pasó la hora ${horaTexto} de hoy.\nPor favor elige una hora futura.`
        };
      }
  
      // ------------------------------------------------------------
      // 4. Validar que esté en intervalos de 30 minutos exactos
      // ------------------------------------------------------------
      if (minutes !== 0 && minutes !== 30) {
        return {
          action: "send_message",
          message: `❌ *Turnos solo en intervalos de 30 minutos*\n\nEjemplos válidos:\n• 09:00\n• 09:30\n• 14:00\n• 16:30`
        };
      }
  
      // ------------------------------------------------------------
      // 5. Validar contra la configuración del negocio
      // ------------------------------------------------------------
      const botNumber = BotNumberService.getBotNumber();
      const barbershops = await Appointment.findBybotNumber(botNumber);
      const idbarbershops = barbershops.idbarbershops;
  
      const [configRows] = await pool.execute(
        "SELECT * FROM barbershops WHERE idbarbershops = ?",
        [idbarbershops]
      );
  
      if (configRows.length === 0) {
        throw new Error("Configuración no encontrada");
      }
  
      const config = configRows[0];
      const [openHour, openMin] = config.open_time.split(":").map(Number);
      const [closeHour, closeMin] = config.close_time.split(":").map(Number);
  
      const openTime = new Date(selectedDate);
      openTime.setHours(openHour, openMin, 0, 0);
  
      const closeTime = new Date(selectedDate);
      closeTime.setHours(closeHour, closeMin, 0, 0);
  
      if (selectedDate < openTime || selectedDate > closeTime) {
        return {
          action: "send_message",
          message: `❌ *Horario fuera de atención*\n\nNuestros horarios son:\n🕐 ${config.open_time} - ${config.close_time}`
        };
      }
  

      const dateStr = selectedDate.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const timeStr = horaTexto; // "HH:MM"
  
      // (Aquí asumimos que la duración fija es de 30 minutos como mencionaste)
      const serviceDuration = 30;
      const isAvailable = await AppointmentController.isSlotAvailable(dateStr, timeStr, idbarbershops);

      
      if (!isAvailable) {
        // --- INICIO DE LA NUEVA LÓGICA PARA SUGERIR HORARIOS ---

        // 1. Obtenemos todos los turnos ya ocupados para ese día.
        const occupiedSlots = await Appointment.getOccupiedSlotsByDate(dateStr, idbarbershops);
        const occupiedTimes = new Set(occupiedSlots.map(slot => slot.appointment_time));

        // 2. Definimos el rango de trabajo en minutos.
        const openTimeMinutes = timeToMinutes(config.open_time);
        const closeTimeMinutes = timeToMinutes(config.close_time);
        
        const availableSlots = [];
        const interval = 30; // Intervalo de 30 minutos

        // 3. Generamos todos los horarios posibles y filtramos los disponibles.
        for (let i = openTimeMinutes; i < closeTimeMinutes; i += interval) {
          const potentialTime = minutesToTime(i);
          
          // Un horario está disponible si NO está en la lista de ocupados.
          if (!occupiedTimes.has(potentialTime)) {
            // Si es hoy, nos aseguramos de no mostrar horarios que ya pasaron.
            const potentialDate = new Date(`${dateStr}T${potentialTime}`);
            if (diff === 0 && potentialDate < new Date()) {
                continue; // Saltar este horario porque ya pasó
            }
            availableSlots.push(potentialTime);
          }
        }

        // 4. Construimos el mensaje de respuesta.
        let responseMessage = `❌ *El turno de las ${timeStr} no está disponible.*\n\n`;

        if (availableSlots.length > 0) {
          responseMessage += `Estos son los horarios libres para el *${diaTexto}*:\n\n`;
          // Formateamos la lista para que sea fácil de leer en WhatsApp
          responseMessage += availableSlots.map(slot => `✅ *${slot}*`).join('\n');
          responseMessage += `\n\nPor favor, elige uno de los horarios disponibles.`;
        } else {
          responseMessage += `Lo sentimos, no quedan más turnos disponibles para el *${diaTexto}*.`;
        }

        return {
          action: "send_message",
          message: responseMessage
        };
        // --- FIN DE LA NUEVA LÓGICA ---
      }
  
      // ------------------------------------------------------------
      // 7. Guardar estado y pedir confirmación
      // ------------------------------------------------------------
      this.setConversationState(phoneNumber, {
        step: "final_confirmation",
        data: { ...state.data, date: selectedDate, time: timeStr }
      });
  
      const dateStr2 = selectedDate.toLocaleDateString("es-ES");
      const horaStr = timeStr;
  
      return {
        action: "send_message",
        message: `📋 *Resumen de tu reserva:*\n\n*Servicio:* ${state.data.service.name}\n*Fecha:* ${dateStr2}\n*Hora:* ${horaStr}\n*Teléfono:* ${phoneNumber}\n*Precio:* $${state.data.service.price}\n\n¿Confirmas esta reserva?\n\nEscribe:\n• "SI" para confirmar\n• "NO" para cancelar`
      };
  
    } catch (error) {
      console.error("Error al validar fecha y hora:", error);
      this.clearConversation(phoneNumber);
      return { action: "restart", message: "⚠️ Error al validar la reserva. Por favor, intenta de nuevo o contáctanos." };
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
        const datesr = new Date(state.data.date);
        const dateISO = datesr.getFullYear() + '-' +
          String(datesr.getMonth() + 1).padStart(2, '0') + '-' +
          String(datesr.getDate()).padStart(2, '0');
        const timeStr = state.data.time;
        const isAvailable = await AppointmentController.isSlotAvailable(dateISO, timeStr, idbarbershops);

        if (!isAvailable) {
          this.clearConversation(phoneNumber);
          return {
            action: 'restart',
            message: `❌ *Horario no disponible*\n\nEl horario ${timeStr} no está disponible para el ${dateISO}. Por favor inicie nuevamente la reserva`
          };
        }
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
