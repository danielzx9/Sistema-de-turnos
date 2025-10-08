const axios = require('axios');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Business = require('../models/Business');
const BotNumberService = require('../services/BotNumberService');
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

            const waId = change.value?.contacts?.[0]?.wa_id;

            BotNumberService.setPhoneNumberClient(waId);


            BotNumberService.setBotNumber(botNumber);


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
    console.log('📨 Llamada a sendConfirmation:', req.body);
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

  static async sendCancelled(req, res) {
    console.log('📨 Llamada a sendCancelled:', req.body);
    const { appointmentId, phoneNumber } = req.body;

    if (!appointmentId || !phoneNumber) {
      return res.status(400).json({ error: 'ID de turno y número de teléfono son requeridos' });
    }

    try {
      const appointment = await getAppointmentDetails(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }

      const message = generateCancelledMessage(appointment);
      await sendWhatsAppMessage(phoneNumber, message);

      res.json({ message: 'Mensaje de confirmación enviado exitosamente' });
    } catch (error) {
      console.error('Error al enviar confirmación:', error);
      res.status(500).json({ error: 'Error al enviar mensaje' });
    }
  }

  static async cancelMyAppointment(phoneNumber, message, idbarbershops) {
    try {
      // ------------------------------------------------------------
      // 1️⃣ Detectar cuál turno desea cancelar (1 o 2)
      // ------------------------------------------------------------
      const regex = /cancelar\s*(\d)?/i;
      const match = message.match(regex);

      if (!match) {
        await sendWhatsAppMessage(phoneNumber, `❌ *Formato inválido*  
  Por favor indica el número del turno que deseas cancelar.  
  
  Ejemplo:
  • CANCELAR 1  
  • CANCELAR 2`);
        return;
      }

      const appointmentIndex = match[1] ? parseInt(match[1], 10) - 1 : null;

      // ------------------------------------------------------------
      // 2️⃣ Obtener los turnos activos del cliente
      // ------------------------------------------------------------
      const appointments = await Appointment.findByPhone(phoneNumber, idbarbershops);

      if (appointments.length === 0) {
        await sendWhatsAppMessage(phoneNumber, `❌ *No tienes turnos activos para cancelar.*`);
        return;
      }

      // ------------------------------------------------------------
      // 3️⃣ Validar índice
      // ------------------------------------------------------------
      if (appointmentIndex === null || appointmentIndex < 0 || appointmentIndex >= appointments.length) {
        let msg = `📅 *Tus Turnos Activos*\n\n`;
        appointments.forEach((apt, index) => {
          const date = new Date(apt.appointment_date).toLocaleDateString('es-ES');
          const timeStr = new Date(apt.appointment_time).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Bogota'
          });
          msg += `${index + 1}. *${apt.service_name}* - ${date} ${timeStr}\n`;
        });
        msg += `\nPor favor indica el número del turno a cancelar.\nEjemplo: CANCELAR 1`;

        await sendWhatsAppMessage(phoneNumber, msg);
        return;
      }

      // ------------------------------------------------------------
      // 4️⃣ Cancelar el turno usando Appointment.delete()
      // ------------------------------------------------------------
      const selectedAppointment = appointments[appointmentIndex];
      const deleted = await Appointment.delete(selectedAppointment.id, idbarbershops);

      if (!deleted) {
        await sendWhatsAppMessage(phoneNumber, `⚠️ No se pudo cancelar el turno seleccionado.`);
        return;
      }

      // ------------------------------------------------------------
      // 5️⃣ Enviar confirmación al cliente
      // ------------------------------------------------------------
      const date = new Date(selectedAppointment.appointment_date).toLocaleDateString('es-ES');
      const timeStr = new Date(selectedAppointment.appointment_time).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Bogota'
      });

      const cancelMsg = `❌ *Turno Cancelado*  
  Tu turno fue eliminado correctamente:  
  
  📅 *Fecha:* ${date}  
  🕐 *Hora:* ${timeStr}  
  💇 *Servicio:* ${selectedAppointment.service_name}  
  💰 *Precio:* $${selectedAppointment.price}
  
  Puedes escribir *RESERVAR* si deseas agendar un nuevo turno.`;

      await sendWhatsAppMessage(phoneNumber, cancelMsg);
    } catch (error) {
      console.error('Error al cancelar turno:', error);
      await sendWhatsAppMessage(phoneNumber, `⚠️ Error al cancelar el turno. Por favor intenta nuevamente o contáctanos.`);
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
  const message1 = message.text.body
  //console.log(message.text.body);

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
    if (response.action === 'call_cancel') {
      // obtenemos idbarbershops igual que en el resto del flujo
      const barbershops = await Appointment.findBybotNumber(botNumberId);
      const idbarbershops = barbershops.idbarbershops;

      // Asegúrate que cancelMyAppointment sea STATIC en la clase WhatsAppController
      await WhatsAppController.cancelMyAppointment(phoneNumber, messageText, idbarbershops);

      // limpiamos estado de la conversación (opcional, según tu necesidad)
      conversationManager.clearConversation(phoneNumber);
      return;
    }
    return;
  }

  const barbershops = await Appointment.findBybotNumber(botNumberId);
  const idbarbershops = barbershops.idbarbershops;

  if (text.includes('mi turno') || text === 'mi turno') {
    await sendMyAppointment(phoneNumber, idbarbershops);

  } else if (text.includes('cancelar') || text === 'cancelar') {


    const appointments = await Appointment.findByPhone(phoneNumber, idbarbershops);

    if (appointments.length === 0) {
      await sendWhatsAppMessage(phoneNumber, `❌ *No tienes turnos activos para cancelar.*`);
      return;
    }

    // 🧠 Guardamos el estado temporal para saber que está en proceso de cancelación
    conversationManager.setConversationState(phoneNumber, {
      step: 'awaiting_cancel_selection',
      data: { appointments }
    });

    // 📋 Enviamos la lista de turnos numerados
    let msg = `📅 *Tus Turnos Activos*\n\n`;
    appointments.forEach((apt, index) => {
      const date = new Date(apt.appointment_date).toLocaleDateString('es-ES');
      const timeStr = new Date(apt.appointment_time).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Bogota'
      });
      msg += `${index + 1}. *${apt.service_name}*\n`;
      msg += `📅 ${date} a las ${timeStr}\n`;
      msg += `💰 $${apt.price}\n`;
      msg += `📊 Estado: ${apt.status === 'pending' ? 'Pendiente' : 'Confirmado'}\n\n`;
    });
    msg += `Por favor indica el número del turno que deseas cancelar.\n\n👉 Ejemplo: *CANCELAR 1*`;

    await sendWhatsAppMessage(phoneNumber, msg);
    return;


  } else if (text.includes('reservar') || text === 'reservar') {

    const waId = message.from; // este es el número del cliente en WhatsApp
    const hahja = BotNumberService.getPhoneNumberClient();
    console.log('****************' + waId);
    console.log('****************' + hahja);
    // Buscar cliente en la BD por wa_id o phone
    const client = await Appointment.findAppointmentByClientId(hahja);
    if (client) {
      const idClient = client.idclients;
      BotNumberService.setIdClient(idClient);
      console.log('****************' + idClient);
      // Verificar si ya tiene un turno pendiente
      const hasPending = await conversationManager.checkExistingAppointment(idClient);

      if (hasPending) {
        await sendWhatsAppMessage(phoneNumber, '⚠️ Ya tienes un turno pendiente. Por favor cancélalo o espera a que termine antes de pedir otro.');
        return;
      }
    }

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
    const botNumber = BotNumberService.getBotNumber();
    const barbershops = await Appointment.findBybotNumber(botNumber);
    const idbarbershops = barbershops.idbarbershops;
    const appointment = await Appointment.findById(appointmentId, idbarbershops); // Assuming barbershop_id 1 for now
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

function generateCancelledMessage(appointment) {
  const date = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
  const time = appointment.appointment_time;

  return `❌ ¡Turno Cancelado! ❌

Hola ${appointment.client_name}, lamentamos informarte que tu turno ha sido cancelado.

📅 *Fecha:* ${date}
🕐 *Hora:* ${time}
💇 *Servicio:* ${appointment.service_name}
⏱️ *Duración:* ${appointment.service_duration} minutos
💰 *Precio:* $${appointment.service_price}

📍 ${process.env.BUSINESS_ADDRESS || 'Dirección del negocio'}
📞 ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}

Si deseas reprogramar tu cita, puedes comunicarte con nosotros. ¡Gracias por tu comprensión! 🙏`;
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

  const botNumber = BotNumberService.getBotNumber();
  const barbershops = await Appointment.findBybotNumber(botNumber);
  const phone = barbershops.business_phone;
  const message = `👋 *¡Hola!*

¡Bienvenido a ${process.env.BUSINESS_NAME || 'nuestro negocio'}!

*Comandos disponibles:*
 "Reservar" - Instrucciones para reservar
 "Mi turno" - Ver tu turno actual
 "Cancelar" - Cancelar tu turno


📞 *Teléfono:* +${phone || 'Teléfono del negocio'}

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