# Sistema de Turnos Meta

Un sistema completo para gestión de turnos y reservas para barberías, clínicas y otros negocios de servicios.

## Características

- 🎯 **Reserva de turnos online** - Los clientes pueden reservar turnos fácilmente
- 📱 **Panel de administración** - Gestión completa de turnos, servicios y horarios
- 💬 **Integración WhatsApp** - Notificaciones automáticas y confirmaciones
- 📊 **Dashboard en tiempo real** - Vista completa del estado de turnos
- 🔐 **Autenticación segura** - Sistema de login para administradores
- 📅 **Calendario integrado** - Visualización clara de disponibilidad

## Tecnologías

### Backend
- Node.js + Express
- MySQL 
- JWT para autenticación
- WhatsApp Business API

### Frontend
- Next.js 14 (React)
- Tailwind CSS
- TypeScript
- React Hook Form

## Instalación Rápida

### Opción 1: Script Automático (Recomendado)
```bash
# Ejecuta el script de instalación
./install.sh
```

### Opción 2: Instalación Manual
1. Clona el repositorio
2. Instala dependencias:
   ```bash
   npm run install:all
   ```

3. Configura las variables de entorno:
   ```bash
   cp server/env.example server/.env
   # Edita server/.env con tu configuración
   ```

4. Ejecuta en modo desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del Proyecto

```
├── client/          # Aplicación frontend (Next.js)
├── server/          # API backend (Node.js/Express)
├── shared/          # Tipos y utilidades compartidas
└── docs/           # Documentación
```

## Configuración WhatsApp

Para habilitar las notificaciones de WhatsApp, consulta la [guía completa de configuración](docs/WHATSAPP_SETUP.md).

### Configuración Básica:
1. Crea una cuenta de WhatsApp Business
2. Configura la API de WhatsApp Business
3. Agrega las credenciales en `server/.env`:
   ```env
   WHATSAPP_TOKEN=tu_token_de_whatsapp_business
   WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
   WHATSAPP_VERIFY_TOKEN=tu_verify_token
   ```

## Despliegue

Consulta la [guía completa de despliegue](docs/DEPLOYMENT.md) para opciones detalladas.

### Opciones de Despliegue:
- **Vercel + Railway** (Recomendado para principiantes)
- **Heroku** (Fácil de usar)
- **VPS** (Máximo control)

### URLs de Acceso:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Panel Admin**: http://localhost:3000/admin

### Credenciales por Defecto:
- **Usuario**: admin
- **Contraseña**: admin123

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request
