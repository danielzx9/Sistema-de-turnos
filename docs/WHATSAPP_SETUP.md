# Configuración de WhatsApp Business API

Esta guía te ayudará a configurar la integración con WhatsApp para enviar notificaciones automáticas de turnos.

## Requisitos Previos

1. Una cuenta de WhatsApp Business
2. Un número de teléfono verificado
3. Una aplicación en Facebook Developers

## Paso 1: Crear una Aplicación en Facebook Developers

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Haz clic en "Mis Apps" → "Crear App"
3. Selecciona "Negocio" como tipo de app
4. Completa la información de tu aplicación

## Paso 2: Configurar WhatsApp Business API

1. En tu aplicación, busca "WhatsApp" en el menú de productos
2. Haz clic en "Configurar" en WhatsApp
3. Agrega un número de teléfono para WhatsApp Business
4. Verifica tu número de teléfono

## Paso 3: Obtener Credenciales

### Token de Acceso
1. En la sección de WhatsApp, ve a "API Setup"
2. Copia el "Temporary access token" (o genera uno permanente)
3. Este será tu `WHATSAPP_TOKEN`

### Phone Number ID
1. En la misma sección, copia el "Phone number ID"
2. Este será tu `WHATSAPP_PHONE_NUMBER_ID`

### Verify Token
1. Crea un token personalizado para verificar webhooks
2. Este será tu `WHATSAPP_VERIFY_TOKEN`

## Paso 4: Configurar Webhook

1. En la sección de WhatsApp, ve a "Configuration"
2. En "Webhook", ingresa:
   - **Callback URL**: `https://tu-dominio.com/api/whatsapp/webhook`
   - **Verify Token**: El token que creaste en el paso anterior
3. Suscríbete a los eventos: `messages`

## Paso 5: Configurar Variables de Entorno

Edita tu archivo `server/.env`:

```env
# WhatsApp Business API
WHATSAPP_TOKEN=tu_token_de_whatsapp_business
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_VERIFY_TOKEN=tu_verify_token
```

## Paso 6: Probar la Integración

1. Inicia tu servidor: `npm run dev`
2. Envía un mensaje a tu número de WhatsApp Business
3. Verifica que recibas una respuesta automática

## Funcionalidades Disponibles

### Mensajes Automáticos
- **Confirmación de turno**: Se envía cuando se crea un turno
- **Recordatorio**: Se puede enviar 24h antes del turno
- **Respuestas automáticas**: Para comandos como "TURNOS", "CANCELAR"

### Comandos de WhatsApp
Los usuarios pueden enviar estos mensajes:
- `TURNOS` - Ver información sobre turnos disponibles
- `CANCELAR` - Instrucciones para cancelar un turno
- Cualquier otro mensaje - Recibe mensaje de bienvenida

## Personalización de Mensajes

Puedes personalizar los mensajes editando el archivo `server/routes/whatsapp.js`:

- `generateConfirmationMessage()` - Mensaje de confirmación
- `generateReminderMessage()` - Mensaje de recordatorio
- `sendWelcomeMessage()` - Mensaje de bienvenida

## Solución de Problemas

### Error 401 (Unauthorized)
- Verifica que tu token de acceso sea válido
- Asegúrate de que el token no haya expirado

### Error 403 (Forbidden)
- Verifica que tu número de teléfono esté verificado
- Confirma que tienes permisos para enviar mensajes

### Webhook no funciona
- Verifica que la URL del webhook sea accesible públicamente
- Confirma que el verify token coincida
- Revisa los logs del servidor para errores

## Límites y Consideraciones

- **Límite de mensajes**: 1000 mensajes por día (gratuito)
- **Ventana de 24h**: Solo puedes enviar mensajes a usuarios que te contactaron en las últimas 24 horas
- **Plantillas**: Para mensajes fuera de la ventana de 24h, necesitas usar plantillas aprobadas

## Recursos Adicionales

- [Documentación oficial de WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Guía de mejores prácticas](https://developers.facebook.com/docs/whatsapp/overview/get-started)
- [Plantillas de mensajes](https://developers.facebook.com/docs/whatsapp/message-templates)
