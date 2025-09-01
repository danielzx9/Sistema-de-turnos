# Guía de Despliegue

Esta guía te ayudará a desplegar tu sistema de turnos en producción.

## Opciones de Despliegue

### Opción 1: Vercel + Railway (Recomendado)

#### Frontend (Vercel)
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno:
   ```
   NEXT_PUBLIC_API_URL=https://tu-api.railway.app/api
   ```
3. Despliega automáticamente

#### Backend (Railway)
1. Conecta tu repositorio a Railway
2. Configura las variables de entorno:
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=tu_jwt_secret_muy_seguro
   DATABASE_URL=postgresql://usuario:password@host:puerto/database
   WHATSAPP_TOKEN=tu_token_whatsapp
   WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
   WHATSAPP_VERIFY_TOKEN=tu_verify_token
   ```
3. Despliega automáticamente

### Opción 2: Heroku

#### Frontend
1. Crea una app en Heroku
2. Conecta tu repositorio
3. Configura buildpack: `heroku/nodejs`
4. Variables de entorno:
   ```
   NEXT_PUBLIC_API_URL=https://tu-backend.herokuapp.com/api
   ```

#### Backend
1. Crea otra app en Heroku
2. Agrega addon de PostgreSQL
3. Variables de entorno similares a Railway

### Opción 3: VPS (Ubuntu/Debian)

#### Instalación en VPS
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Clonar repositorio
git clone https://github.com/tu-usuario/app-turnos-meta.git
cd app-turnos-meta

# Instalar dependencias
npm run install:all

# Configurar variables de entorno
cp server/env.example server/.env
nano server/.env  # Editar configuración

# Construir frontend
cd client
npm run build
cd ..

# Iniciar con PM2
pm2 start server/index.js --name "turnos-api"
pm2 start "cd client && npm start" --name "turnos-web"

# Configurar PM2 para inicio automático
pm2 startup
pm2 save
```

#### Configurar Nginx (Opcional)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Configuración de Base de Datos

### PostgreSQL (Producción)
```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Crear usuario y base de datos
sudo -u postgres psql
CREATE USER turnos_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE turnos_db OWNER turnos_user;
GRANT ALL PRIVILEGES ON DATABASE turnos_db TO turnos_user;
\q
```

### Variables de entorno para PostgreSQL
```env
DATABASE_URL=postgresql://turnos_user:tu_password_seguro@localhost:5432/turnos_db
```

## Configuración de Dominio

### Con Cloudflare (Recomendado)
1. Agrega tu dominio a Cloudflare
2. Configura DNS:
   - `A` record: `@` → IP de tu servidor
   - `CNAME` record: `www` → tu-dominio.com
3. Habilita SSL/TLS automático

### SSL con Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

## Monitoreo y Logs

### PM2 Monitoring
```bash
# Ver logs
pm2 logs

# Monitorear recursos
pm2 monit

# Reiniciar aplicación
pm2 restart turnos-api
```

### Logs de Nginx
```bash
# Ver logs de acceso
sudo tail -f /var/log/nginx/access.log

# Ver logs de error
sudo tail -f /var/log/nginx/error.log
```

## Backup y Mantenimiento

### Backup de Base de Datos
```bash
# Crear backup
pg_dump -h localhost -U turnos_user turnos_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -h localhost -U turnos_user turnos_db < backup_20240101.sql
```

### Actualización de la Aplicación
```bash
# Detener aplicaciones
pm2 stop all

# Actualizar código
git pull origin main

# Reinstalar dependencias
npm run install:all

# Reconstruir frontend
cd client && npm run build && cd ..

# Reiniciar aplicaciones
pm2 restart all
```

## Variables de Entorno de Producción

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro_aqui
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://usuario:password@host:puerto/database
WHATSAPP_TOKEN=tu_token_whatsapp_business
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_VERIFY_TOKEN=tu_verify_token
BUSINESS_NAME=Mi Barbería
BUSINESS_PHONE=+1234567890
BUSINESS_ADDRESS=Dirección de tu negocio
BUSINESS_EMAIL=contacto@mibarberia.com
DEFAULT_OPEN_TIME=09:00
DEFAULT_CLOSE_TIME=18:00
DEFAULT_SLOT_DURATION=30
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://tu-api.railway.app/api
```

## Checklist de Despliegue

- [ ] Variables de entorno configuradas
- [ ] Base de datos configurada y migrada
- [ ] SSL/HTTPS configurado
- [ ] Dominio configurado
- [ ] WhatsApp webhook configurado
- [ ] Backup automático configurado
- [ ] Monitoreo configurado
- [ ] Logs configurados
- [ ] Pruebas de funcionalidad completadas

## Solución de Problemas Comunes

### Error de conexión a base de datos
- Verifica que PostgreSQL esté ejecutándose
- Confirma las credenciales en DATABASE_URL
- Verifica que el firewall permita conexiones

### Error 500 en API
- Revisa logs de PM2: `pm2 logs turnos-api`
- Verifica variables de entorno
- Confirma que todas las dependencias estén instaladas

### Frontend no carga
- Verifica que el build se completó correctamente
- Confirma NEXT_PUBLIC_API_URL
- Revisa logs de PM2: `pm2 logs turnos-web`
