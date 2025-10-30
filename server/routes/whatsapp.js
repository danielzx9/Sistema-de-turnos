const express = require('express');
const { authenticateToken } = require('./auth');
const WhatsAppController = require('../controllers/WhatsAppController');

const router = express.Router();

// Webhook para recibir mensajes de WhatsApp
router.get('/webhook', WhatsAppController.webhookGet);

// Webhook para procesar mensajes entrantes
router.post('/webhook', WhatsAppController.webhookPost);

// Enviar mensaje de confirmación de turno
router.post('/send-confirmation', authenticateToken, WhatsAppController.sendConfirmation);

// Enviar recordatorio de turno
router.post('/send-reminder', authenticateToken, WhatsAppController.sendReminder);

router.post('/send-cancelled', authenticateToken, WhatsAppController.sendCancelled);



module.exports = router;
