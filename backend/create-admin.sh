#!/bin/bash

# Script para crear usuario administrador en Hot Wheels Manager
# Uso: ./create-admin.sh

echo "🔐 Hot Wheels Manager - Crear Usuario Admin"
echo "============================================"
echo ""

# Verificar que Node.js esté disponible
export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"

# Verificar que el build exista
if [ ! -d "dist" ]; then
  echo "❌ Error: El directorio 'dist' no existe. Ejecuta 'npm run build' primero."
  exit 1
fi

# Solicitar información del usuario
read -p "📧 Email del admin: " email
read -sp "🔑 Contraseña (mínimo 6 caracteres): " password
echo ""
read -p "👤 Nombre completo: " name

echo ""
echo "Creando usuario administrador..."
echo ""

# Ejecutar el script
node dist/scripts/createAdmin.js "$email" "$password" "$name"

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo ""
  echo "✅ ¡Usuario creado exitosamente!"
  echo ""
  echo "📝 Credenciales:"
  echo "   Email: $email"
  echo "   Nombre: $name"
  echo ""
  echo "🚀 Ahora puedes iniciar sesión en la aplicación"
else
  echo ""
  echo "❌ Error al crear el usuario. Verifica que:"
  echo "   1. MONGODB_URI esté configurado en .env"
  echo "   2. La base de datos esté accesible"
  echo "   3. No exista ya un usuario con ese email"
fi
