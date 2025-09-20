#!/bin/bash

echo "🚀 Instalando Sistema de Turnos Meta..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Se requiere Node.js 18 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Instalar dependencias del proyecto principal
echo "📦 Instalando dependencias del proyecto principal..."
npm install

# Instalar dependencias del servidor
echo "📦 Instalando dependencias del servidor..."
cd server
npm install
cd ..

# Instalar dependencias del cliente
echo "📦 Instalando dependencias del cliente..."
cd client
npm install
cd ..

# Crear archivo .env para el servidor
echo "⚙️ Configurando variables de entorno..."
if [ ! -f "server/.env" ]; then
    cp server/env.example server/.env
    echo "✅ Archivo .env creado. Por favor edita server/.env con tu configuración."
else
    echo "⚠️ El archivo server/.env ya existe. No se sobrescribió."
fi

# Crear archivo .env.local para el cliente
if [ ! -f "client/.env.local" ]; then
    cat > client/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF
    echo "✅ Archivo client/.env.local creado."
else
    echo "⚠️ El archivo client/.env.local ya existe. No se sobrescribió."
fi

echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita server/.env con tu configuración (especialmente JWT_SECRET)"
echo "2. Para desarrollo, ejecuta: npm run dev"
echo "3. Para producción, ejecuta: npm run build && npm start"
echo ""
echo "🌐 URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:3001/api"
echo "- Panel Admin: http://localhost:3000/admin"
echo ""
echo "🔑 Credenciales por defecto del admin:"
echo "- Usuario: admin"
echo "- Contraseña: admin123"
echo ""
echo "📚 Para más información, consulta el README.md"
