const express = require('express');
const axios = require('axios');
const { getPool } = require('../database/init');
const { authenticateToken } = require('./auth');
const conversationManager = require('../utils/conversationManager');

const router = express.Router();

// Configuración de WhatsApp
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Webhook para recibir mensajes de WhatsApp
router.get('/webhook', (req, res) => {
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
});

// Webhook para procesar mensajes entrantes
router.post('/webhook', (req, res) => {
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
              processIncomingMessage(message,botNumber);
            });
          }
        }
      });
    });
  }

  res.status(200).send('OK');
});

// Enviar mensaje de confirmación de turno
router.post('/send-confirmation', authenticateToken, async (req, res) => {
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
});

// Enviar recordatorio de turno
router.post('/send-reminder', authenticateToken, async (req, res) => {
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
});

// Función para procesar mensajes entrantes
async function processIncomingMessage(message,botNumberId) {
  const phoneNumber = message.from;
  const messageText = message.text?.body || '';
  
  console.log(`Mensaje recibido de ${phoneNumber}: ${messageText}`);
  
  const text = messageText.toLowerCase().trim();
  
  // Verificar si hay una conversación activa
  const conversationState = conversationManager.getConversationState(phoneNumber);
  
  if (conversationState && !conversationManager.isConversationExpired(phoneNumber)) {
    // Procesar respuesta en conversación activa
    const response = await conversationManager.processUserResponse(phoneNumber, messageText,botNumberId);
    
    if (response.action === 'send_message') {
      await sendWhatsAppMessage(phoneNumber, response.message);
    } else if (response.action === 'restart') {
      await sendWhatsAppMessage(phoneNumber, response.message);
    }
    return;
  }
  
  // Comandos del bot (solo si no hay conversación activa)
 if (text.includes('mi turno') || text === 'mi turno') {
    await sendMyAppointment(phoneNumber,botNumberId);
  }  else if (text.includes('reservar') || text === 'reservar') {
    // Iniciar proceso de reserva directa
    conversationManager.startReservation(phoneNumber);
    await sendReservationStart(phoneNumber);
  } else {
    await sendWelcomeMessage(phoneNumber);
  }
}

// Función para enviar mensaje de WhatsApp
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

// Función para obtener detalles del turno
async function getAppointmentDetails(appointmentId) {
  try {
    const pool = getPool();

    const [rows] = await pool.execute(
      `SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        c.name as client_name,
        c.phone as client_phone,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.idclients
      JOIN services s ON a.service_id = s.idservices
      WHERE a.idappointments = ?`,
      [appointmentId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw error;
  }
}

// Función para generar mensaje de confirmación
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

// Función para generar mensaje de recordatorio
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

// Función para enviar slots disponibles
async function sendAvailableSlots(phoneNumber) {
  try {
    const pool = getPool();

    // Obtener servicios disponibles
    const [services] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE is_active = 1 AND barbershop_id = 1 ORDER BY name'
    );

    // Obtener configuración del negocio
    const [configRows] = await pool.execute(
      'SELECT idbarbershops as id, business_name, business_phone, business_address, business_email, open_time, close_time, slot_duration, working_days, created_at, updated_at FROM barbershops WHERE idbarbershops = 1'
    );

    const config = configRows.length > 0 ? configRows[0] : null;

    let servicesList = '';
    services.forEach(service => {
      servicesList += `• ${service.name} - $${service.price} (${service.duration} min)\n`;
    });

    const message = `📅 *Turnos Disponibles*

*Servicios disponibles:*
${servicesList}

*Horarios de atención:*
🕐 ${config?.open_time || '09:00'} - ${config?.close_time || '18:00'}
📅 Lunes a Viernes

*Para reservar:*
1️⃣ Escribe "RESERVAR" para reservar desde WhatsApp
2️⃣ Visita: http://localhost:3000
3️⃣ Llámanos: ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}

*Otros comandos:*
• "MI TURNO" - Ver tu turno actual
• "CANCELAR" - Cancelar turno
• "HORARIOS" - Ver horarios disponibles

¡Estamos aquí para ayudarte! 😊`;
    
    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    await sendWhatsAppMessage(phoneNumber, '❌ Error al obtener información. Por favor, contáctanos directamente.');
  }
}

// Función para enviar instrucciones de cancelación
async function sendCancellationInstructions(phoneNumber) {
  const message = `❌ *Cancelación de Turno*

Para cancelar tu turno, por favor:

1. Contáctanos con al menos 2 horas de anticipación
2. Proporciona tu nombre y la fecha/hora del turno
3. Te confirmaremos la cancelación

📞 *Teléfono:* ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}
🌐 *Sitio web:* [Tu sitio web aquí]

¡Gracias por tu comprensión! 😊`;
  
  await sendWhatsAppMessage(phoneNumber, message);
}

// Función para enviar mensaje de bienvenida
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

// Función para enviar información de mi turno
async function sendMyAppointment(phoneNumber) {
  try {
    const pool = getPool();

    // Normalizar el número de teléfono para buscar en ambos formatos
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const phoneWithoutPlus = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    const [appointments] = await pool.execute(`
      SELECT
        a.idappointments as id,
        a.client_id,
        a.service_id,
        a.barbershop_id,
        a.barber_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at,
        s.name as service_name,
        s.price
      FROM appointments a
      JOIN services s ON a.service_id = s.idservices
      JOIN clients c ON a.client_id = c.idclients
      WHERE (c.phone = ? OR c.phone = ?) AND a.status IN ('pending', 'confirmed') AND a.barbershop_id = 1
      ORDER BY a.appointment_date, a.appointment_time
    `, [normalizedPhone, phoneWithoutPlus, ]);

    if (appointments.length === 0) {
      await sendWhatsAppMessage(phoneNumber, `❌ *No tienes turnos activos*

No encontramos turnos pendientes o confirmados para tu número.

Para reservar un turno:
• Escribe "RESERVAR" para instrucciones
`);
    } else {
      let message = `📅 *Tus Turnos Activos*\n\n`;
      appointments.forEach((apt, index) => {
        const date = new Date(apt.appointment_date).toLocaleDateString('es-ES');
        message += `${index + 1}. *${apt.service_name}*\n`;
        message += `📅 ${date} a las ${apt.appointment_time}\n`;
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

// Función para enviar horarios de atención
/*async function sendBusinessHours(phoneNumber) {
  try {
    const pool = getPool();
    const [configRows] = await pool.execute(
      'SELECT idbarbershops as id, business_name, business_phone, business_address, business_email, open_time, close_time, slot_duration, working_days, created_at, updated_at FROM barbershops WHERE idbarbershops = 1'
    );

    const config = configRows.length > 0 ? configRows[0] : null;

    const message = `🕐 *Horarios de Atención*

*Días laborables:*
📅 Lunes a Viernes
⏰ ${config?.open_time || '09:00'} - ${config?.close_time || '18:00'}

*Duración de turnos:*
⏱️ ${config?.slot_duration || 30} minutos

*Para reservar:*
• Escribe "RESERVAR" para instrucciones

📞 *Teléfono:* ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}`;

    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    await sendWhatsAppMessage(phoneNumber, '❌ Error al obtener horarios. Por favor, contáctanos directamente.');
  }
}*/

// Función para enviar instrucciones de reserva
async function sendReservationInstructions(phoneNumber) {
  const message = `📝 *Cómo Reservar tu Turno*


*WhatsApp Directo*
✅ Escribe "RESERVAR" para reservar desde WhatsApp
✅ Te guiaremos paso a paso


¡Estamos aquí para ayudarte! 😊`;

  await sendWhatsAppMessage(phoneNumber, message);
}

// Función para iniciar proceso de reserva directa
async function sendReservationStart(phoneNumber) {
  try {
    const pool = getPool();
    const [services] = await pool.execute(
      'SELECT idservices as id, barbershop_id, name, description, duration, price, is_active, created_at, updated_at FROM services WHERE is_active = 1 AND barbershop_id = 1 ORDER BY name'
    );

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




module.exports = router;
