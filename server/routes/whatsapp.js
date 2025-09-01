const express = require('express');
const axios = require('axios');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

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
          const messages = change.value.messages;
          if (messages) {
            messages.forEach(message => {
              processIncomingMessage(message);
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
async function processIncomingMessage(message) {
  const phoneNumber = message.from;
  const messageText = message.text?.body || '';
  
  console.log(`Mensaje recibido de ${phoneNumber}: ${messageText}`);
  
  // Aquí puedes implementar lógica para responder automáticamente
  // Por ejemplo, comandos como "TURNOS", "CANCELAR", etc.
  
  if (messageText.toLowerCase().includes('turnos')) {
    await sendAvailableSlots(phoneNumber);
  } else if (messageText.toLowerCase().includes('cancelar')) {
    await sendCancellationInstructions(phoneNumber);
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
function getAppointmentDetails(appointmentId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.get(
      `SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE a.id = ?`,
      [appointmentId],
      (err, appointment) => {
        if (err) {
          reject(err);
        } else {
          resolve(appointment);
        }
      }
    );
  });
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
  const message = `📅 *Turnos Disponibles*

Para ver los turnos disponibles y reservar, visita nuestro sitio web o contáctanos directamente.

🌐 *Sitio web:* [Tu sitio web aquí]
📞 *Teléfono:* ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}

*Servicios disponibles:*
• Corte de cabello
• Barba
• Corte + Barba
• Lavado de cabello

¡Estamos aquí para ayudarte! 😊`;
  
  await sendWhatsAppMessage(phoneNumber, message);
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

Para reservar un turno, puedes:
• Visitar nuestro sitio web
• Llamarnos directamente
• Escribir "TURNOS" para más información

📞 *Teléfono:* ${process.env.BUSINESS_PHONE || 'Teléfono del negocio'}
🌐 *Sitio web:* [Tu sitio web aquí]
📍 *Dirección:* ${process.env.BUSINESS_ADDRESS || 'Dirección del negocio'}

¡Estamos aquí para ayudarte! 😊`;
  
  await sendWhatsAppMessage(phoneNumber, message);
}

module.exports = router;
