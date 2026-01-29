# PM2 Automation Setup

Tu aplicación ahora está configurada para ejecutarse automáticamente con **pm2** (Process Manager 2) con watch de cambios.

## Comandos Disponibles

### Iniciar Services con PM2
```bash
npm run pm2:start
```
Inicia both backend y frontend con watch automático de cambios en `src/` folders.

### Ver Estado de los Procesos
```bash
npm run pm2:status
```
Muestra tabla con información de uptime, CPU, memoria, estado de cada servicio.

### Reiniciar Todos los Servicios
```bash
npm run pm2:restart
```
Reinicia backend y frontend sin parar completamente.

### Parar Todos los Servicios
```bash
npm run pm2:stop
```
Pausa ambos servicios (no los mata, pueden reiniciarse después).

### Ver Logs en Tiempo Real
```bash
npm run pm2:logs
```
Muestra logs de both backend y frontend en tiempo real.

```bash
npm run pm2:logs:backend
```
Solo logs del backend.

```bash
npm run pm2:logs:frontend
```
Solo logs del frontend.

### Eliminar Todos los Procesos de PM2
```bash
npm run pm2:kill
```
Para completamente pm2 y elimina todos los procesos. Útil cuando necesitas limpiar todo.

## Configuración

Toda la configuración está en `ecosystem.config.js`:
- **Backend**: Corre en puerto 3001, watches en `backend/src`
- **Frontend**: Corre en puerto 5173, watches en `frontend/src` e `index.html`
- **Logs**: Se guardan en `backend/logs/` y `frontend/logs/` para debugging
- **Max Memory**: 500MB por servicio para evitar memory leaks
- **Auto-restart**: Los servicios se reinician automáticamente si fallan

## Ventajas

✅ Ambos servicios siempre activos en background
✅ Reinicio automático si un servicio crash
✅ Watch automático de cambios en el código
✅ Logs persistentes para debugging
✅ Una sola command para iniciar todo
✅ Monitoreo de uptime, CPU, memoria
✅ Compatible con PM2+ Dashboard (https://app.pm2.io)

## Próximos Pasos

1. **Verifica que todo esté corriendo**:
   ```bash
   npm run pm2:status
   ```

2. **Abre tu navegador** en `http://localhost:5173`

3. **Revisa los logs** si hay problemas:
   ```bash
   npm run pm2:logs
   ```

4. **Para detener todo** (cuando termines desarrollo):
   ```bash
   npm run pm2:kill
   ```

## Tips

- Los procesos continuarán corriendo incluso si cierras la terminal
- Puedes hacer cambios en tu código y pm2 automáticamente reiniciará los servicios
- Los logs se guardan en archivos para debugging después
- Para ver todo más lindo: instala `npm install -g pm2` globalmente y usa `pm2 monit`
