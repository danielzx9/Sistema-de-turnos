const axios = require('axios');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Business = require('../models/Business');
const conversationManager = require('../utils/conversationManager');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

class WhatsAppController {
  static webhookGet(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Webhook de WhatsApp verificado');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Error en verificación de webhook');
      res.status(403).send('Forbidden');
    }
  }

  static webhookPost(req, res) {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(entry => {
        entry.changes.forEach(change => {
          if (change.field === 'messages') {
            const metadata = change.value?.metadata || {};
            const messages = change.value.messages;
            const botNumber = metadata.display_phone_number;
            if (messages) {
              messages.forEach(message => {
                processIncomingMessage(message, botNumber);
              });
            }
          }
        });
      });
    }

    res.status(200).send('OK');
  }

  static async sendConfirmation(req, res) {
    const { appointmentId, phoneNumber } = req.body;

    if (!appointmentId || !phoneNumber) {
      return res.status(400).json({ error: 'ID de turno y número de teléfono son requeridos' });
    }

    try {
      const appointment = await getAppointmentDetails(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      const message = generateConfirmationMessage(appointment);
      await sendWhatsAppMessage(phoneNumber, message);

      res.json({ message: 'Mensaje de confirmación enviado exitosamente' });
    } catch (error) {
      console.error('Error al enviar confirmación:', error);
      res.status(500).json({ error: 'Error al enviar mensaje' });
    }
  }

  static async sendReminder(req, res) {
    const { appointmentId, phoneNumber } = req.body;

    if (!appointmentId || !phoneNumber) {
      return res.status(400).json({ error: 'ID de turno y número de teléfono son requeridos' });
    }

    try {
      const appointment = await getAppointmentDetails(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      const message = generateReminderMessage(appointment);
      await sendWhatsAppMessage(phoneNumber, message);

      res.json({ message: 'Recordatorio enviado exitosamente' });
    } catch (error) {
      console.error('Error al enviar recordatorio:', error);
      res.status(500).json({ error: 'Error al enviar mensaje' });
    }
  }
}

// Helper functions
async function processIncomingMessage(message, botNumberId) {
  const phoneNumber = message.from;
  const messageText = message.text?.body || '';

  console.log(`Mensaje recibido de ${phoneNumber}: ${messageText}`);

  const text = messageText.toLowerCase().trim();

  const conversationState = conversationManager.getConversationState(phoneNumber);

  if (conversationState && !conversationManager.isConversationExpired(phoneNumber)) {
    const response = await conversationManager.processUserResponse(phoneNumber, messageText, botNumberId);

    if (response.action === 'send_message') {
      await sendWhatsAppMessage(phoneNumber, response.message);
    } else if (response.action === 'restart') {
      await sendWhatsAppMessage(phoneNumber, response.message);
    }
    return;
  }

  const barbershops = await Appointment.findBybotNumber(botNumberId);
  const idbarbershops = barbershops.idbarbershops;

  if (text.includes('mi turno') || text === 'mi turno') {
    await sendMyAppointment(phoneNumber, idbarbershops);
  } else if (text.includes('reservar') || text === 'reservar') {
    conversationManager.startReservation(phoneNumber);
    await sendReservationStart(phoneNumber, idbarbershops);
  } else {
    await sendWelcomeMessage(phoneNumber);
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.log('⚠️ Configuración de WhatsApp no disponible');
    return;
  }

  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mensaje enviado exitosamente:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error.response?.data || error.message);
    throw error;
  }
}

async function getAppointmentDetails(appointmentId) {
  try {
    const appointment = await Appointment.findById(appointmentId, 1); // Assuming barbershop_id 1 for now
    return appointment;
  } catch (error) {
    throw error;
  }
}

function generateConfirmationMessage(appointment) {
  const date = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
  const time = appointment.appointment_time;

  return `🎉 *¡Turno Confirmado!*

Hola ${appointment.client_name}, tu turno ha sido confirmado:

📅 *Fecha:* ${date}
🕐 *Hora:* ${time}
💇 *Servicio:* ${appointment.service_name}
⏱️ *Duración:* ${appointment.service_duration} minutos
💰 *Precio:* $${appointment.service_price}

¡Te esperamos en ${process.env.BUSINESS_NAME || 'nuestro local'}!

📍 ${process.env.BUSINESS_ADDRESS || 'Dirección del negocio'}
📞 ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}

*Importante:* Si necesitas cancelar o reprogramar, contáctanos con al menos 2 horas de anticipación.`;
}

function generateReminderMessage(appointment) {
  const date = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
  const time = appointment.appointment_time;

  return `⏰ *Recordatorio de Turno*

Hola ${appointment.client_name}, te recordamos que tienes un turno mañana:

📅 *Fecha:* ${date}
🕐 *Hora:* ${time}
💇 *Servicio:* ${appointment.service_name}

¡No olvides venir a tu cita!

📍 ${process.env.BUSINESS_ADDRESS || 'Dirección del negocio'}
📞 ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}

Si necesitas cancelar o reprogramar, contáctanos lo antes posible.`;
}

async function sendWelcomeMessage(phoneNumber) {
  const message = `👋 *¡Hola!*

¡Bienvenido a ${process.env.BUSINESS_NAME || 'nuestro negocio'}!

*Comandos disponibles:*
1. "RESERVAR" - Instrucciones para reservar
2. "MI TURNO" - Ver tu turno actual

📞 *Teléfono:* ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}
🌐 *Sitio web:* http://localhost:3000
📍 *Dirección:* ${process.env.BUSINESS_ADDRESS || 'Dirección del negocio'}

¡Estamos aquí para ayudarte! 😊`;

  await sendWhatsAppMessage(phoneNumber, message);
}

async function sendMyAppointment(phoneNumber, idbarbershops) {
  try {
    const appointments = await Appointment.findByPhone(phoneNumber, idbarbershops);

    if (appointments.length === 0) {
      await sendWhatsAppMessage(phoneNumber, `❌ *No tienes turnos activos*

No encontramos turnos pendientes o confirmados para tu número.

Para reservar un turno:
• Escribe "RESERVAR" para instrucciones`);
    } else {
      let message = `📅 *Tus Turnos Activos*\n\n`;
      appointments.forEach((apt, index) => {
        const timeStr = new Date(apt.appointment_time)
          .toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Bogota'
          });
        const date = new Date(apt.appointment_date).toLocaleDateString('es-ES');
        message += `${index + 1}. *${apt.service_name}*\n`;
        message += `📅 ${date} a las ${timeStr}\n`;
        message += `💰 $${apt.price}\n`;
        message += `📊 Estado: ${apt.status === 'pending' ? 'Pendiente' : 'Confirmado'}\n\n`;
      });
      message += `Para cancelar, escribe "CANCELAR"`;

      await sendWhatsAppMessage(phoneNumber, message);
    }
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    await sendWhatsAppMessage(phoneNumber, '❌ Error al obtener tus turnos. Por favor, contáctanos directamente.');
  }
}

async function sendReservationStart(phoneNumber, idbarbershops) {
  try {
    const services = await Service.findActiveByBarbershopId(idbarbershops);
    let serviceList = '🎯 *¡Vamos a reservar tu turno!*\n\n*Servicios disponibles:*\n\n';
    services.forEach((service, index) => {
      serviceList += `${index + 1}. ${service.name} - $${service.price} (${service.duration} min)\n`;
    });
    serviceList += '\n*Escribe el número del servicio que deseas:*\n\n*Ejemplo:* 1, 2, 3...';

    await sendWhatsAppMessage(phoneNumber, serviceList);
  } catch (error) {
    console.error('Error al iniciar reserva:', error);
    await sendWhatsAppMessage(phoneNumber, '❌ Error al iniciar la reserva. Por favor, contáctanos directamente.');
  }
}

module.exports = WhatsAppController;