w# Hot Wheels Manager

Una aplicación web completa para gestionar tu negocio de Hot Wheels, incluyendo inventario, ventas, compras, entregas y precios.

## 🚗 Características

- **Inventario**: Gestiona tus piezas con fotos, precios y cantidades
- **Ventas**: Registra ventas con detalles del comprador y ganancias
- **Compras**: Registra compras, costos de envío y rastreo
- **Entregas**: Calendario de entregas con contacto de clientes
- **Precios**: Consulta y actualiza precios de mercado
- **Dashboard**: Métricas y resumen general del negocio

## 🛠️ Tecnologías

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript + MongoDB
- **Despliegue**: Vercel + MongoDB Atlas

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone <url-repo>
cd hot-wheels-manager
```

2. Instala dependencias:
```bash
npm run install:all
```

3. Configura variables de entorno:
   - Copia `.env.example` a `.env` en `backend/`
   - Configura tu base de datos MongoDB (ver sección Base de Datos)

4. Configura MongoDB:
```bash
# Ver instrucciones completas en MONGODB_LOCAL_SETUP.md
# Para desarrollo local (recomendado):
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

5. Ejecuta en modo desarrollo:
```bash
npm run dev
```

## 💾 Base de Datos

Este proyecto soporta dos opciones de base de datos:

### Opción 1: MongoDB Local (Recomendado para desarrollo)

✅ **Ventajas**: Gratis, rápido, sin límites, ideal para desarrollo

```bash
# Instalar MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verificar instalación
./scripts/check-mongodb.sh

# Configurar .env
MONGODB_URI=mongodb://localhost:27017/hot-wheels-manager
```

**Scripts útiles:**
- `./scripts/check-mongodb.sh` - Verifica que MongoDB esté funcionando
- `./scripts/backup-mongodb.sh` - Crea backup de tu base de datos
- `./scripts/restore-mongodb.sh` - Restaura un backup

Ver [MONGODB_LOCAL_SETUP.md](MONGODB_LOCAL_SETUP.md) para instrucciones completas.

### Opción 2: MongoDB Atlas (Para producción en la nube)

```bash
# Configurar .env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database
```

## 📱 Uso

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 📁 Estructura del Proyecto

```
hot-wheels-manager/
├── frontend/          # React App
├── backend/           # Express.js API
├── shared/            # Tipos compartidos
└── docs/              # Documentación
```

## 🔧 Scripts Disponibles

- `npm run dev` - Ejecuta frontend y backend en desarrollo
- `npm run build` - Construye la aplicación completa
- `npm run install:all` - Instala todas las dependencias

## 📦 Despliegue

### Frontend (Vercel)
1. Conecta tu repositorio con Vercel
2. Configura el directorio raíz como `frontend`
3. Despliega automáticamente

### Backend
- MongoDB Atlas para la base de datos
- Variables de entorno configuradas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
