# Guía de Uso del Sistema de Turnos

Esta guía te ayudará a usar el sistema de turnos de manera efectiva.

## Para Clientes

### Reservar un Turno

1. **Accede al sitio web** de tu barbería
2. **Selecciona un servicio** de la lista disponible
3. **Completa tus datos**:
   - Nombre completo
   - Número de teléfono
   - Email (opcional)
4. **Elige fecha y hora** disponible
5. **Confirma tu reserva**

### Recibir Notificaciones

- **Confirmación**: Recibirás un mensaje de WhatsApp confirmando tu turno
- **Recordatorio**: Te llegará un recordatorio 24 horas antes
- **Cambios**: Si necesitas cancelar o reprogramar, contáctanos

## Para Administradores

### Acceder al Panel

1. Ve a `/admin` en tu sitio web
2. Inicia sesión con tus credenciales
3. Accede al dashboard principal

### Gestionar Turnos

#### Ver Turnos
- **Dashboard**: Vista general de estadísticas
- **Lista de Turnos**: Todos los turnos con filtros por fecha y estado
- **Estados**: Pendiente, Confirmado, Completado, Cancelado

#### Cambiar Estado de Turnos
- **Confirmar**: Marca un turno como confirmado
- **Completar**: Marca un turno como completado
- **Cancelar**: Cancela un turno

### Gestionar Servicios

#### Crear Servicio
1. Ve a "Servicios" en el panel
2. Haz clic en "Nuevo Servicio"
3. Completa la información:
   - Nombre del servicio
   - Descripción
   - Duración en minutos
   - Precio
4. Guarda el servicio

#### Editar Servicio
- Haz clic en el ícono de editar
- Modifica la información necesaria
- Guarda los cambios

#### Activar/Desactivar Servicio
- Usa el botón de estado para activar/desactivar
- Los servicios inactivos no aparecen en el sitio público

### Configurar el Negocio

#### Información Básica
- Nombre del negocio
- Teléfono de contacto
- Email de contacto
- Dirección

#### Horarios
- Hora de apertura
- Hora de cierre
- Duración de cada slot (15, 30, 45, 60 minutos)
- Días de trabajo (Lunes a Domingo)

## Funcionalidades de WhatsApp

### Mensajes Automáticos

#### Confirmación de Turno
Se envía automáticamente cuando se crea un turno:
```
🎉 ¡Turno Confirmado!

Hola [Nombre], tu turno ha sido confirmado:

📅 Fecha: [Fecha]
🕐 Hora: [Hora]
💇 Servicio: [Servicio]
⏱️ Duración: [Duración] minutos
💰 Precio: $[Precio]

¡Te esperamos en [Nombre del Negocio]!
```

#### Recordatorio
Se puede enviar 24 horas antes del turno:
```
⏰ Recordatorio de Turno

Hola [Nombre], te recordamos que tienes un turno mañana:

📅 Fecha: [Fecha]
🕐 Hora: [Hora]
💇 Servicio: [Servicio]

¡No olvides venir a tu cita!
```

### Comandos de WhatsApp

Los clientes pueden enviar estos mensajes a tu número de WhatsApp Business:

- **"TURNOS"** - Recibe información sobre turnos disponibles
- **"CANCELAR"** - Recibe instrucciones para cancelar un turno
- **Cualquier otro mensaje** - Recibe mensaje de bienvenida

## Mejores Prácticas

### Para Administradores

1. **Revisa turnos diariamente**
   - Confirma turnos pendientes
   - Marca turnos completados
   - Cancela turnos no asistidos

2. **Mantén servicios actualizados**
   - Actualiza precios regularmente
   - Agrega nuevos servicios
   - Desactiva servicios no disponibles

3. **Configura horarios correctamente**
   - Ajusta horarios según temporadas
   - Configura días festivos
   - Actualiza duración de slots según necesidad

4. **Usa WhatsApp efectivamente**
   - Envía recordatorios 24h antes
   - Responde consultas rápidamente
   - Personaliza mensajes según tu negocio

### Para Clientes

1. **Reserva con anticipación**
   - Los mejores horarios se llenan rápido
   - Reserva al menos 24h antes

2. **Mantén tus datos actualizados**
   - Asegúrate de que tu teléfono sea correcto
   - Agrega tu email para notificaciones

3. **Cancela con anticipación**
   - Cancela al menos 2 horas antes
   - Permite que otros clientes tomen tu horario

## Solución de Problemas

### Problemas Comunes

#### No puedo ver horarios disponibles
- Verifica que el servicio esté activo
- Confirma que la fecha no sea un día cerrado
- Revisa que no esté fuera del horario de atención

#### No recibo notificaciones de WhatsApp
- Verifica que tu número esté correcto
- Confirma que WhatsApp Business esté configurado
- Revisa que el webhook esté funcionando

#### Error al confirmar turno
- Verifica que todos los campos estén completos
- Confirma que el horario siga disponible
- Intenta con otro horario

### Contacto de Soporte

Si tienes problemas técnicos:
1. Revisa los logs del servidor
2. Verifica la configuración de variables de entorno
3. Consulta la documentación técnica
4. Contacta al desarrollador

## Personalización

### Mensajes de WhatsApp
Puedes personalizar los mensajes editando `server/routes/whatsapp.js`:
- Cambia el texto de confirmación
- Modifica el mensaje de recordatorio
- Personaliza respuestas automáticas

### Estilos del Sitio
Puedes personalizar la apariencia editando:
- `client/tailwind.config.js` - Colores y tema
- `client/app/globals.css` - Estilos globales
- Componentes individuales en `client/components/`

### Configuración del Negocio
Ajusta la configuración en el panel de administración:
- Información de contacto
- Horarios de atención
- Servicios disponibles
- Precios y duraciones
