import { Request, Response } from 'express';
import { updateHotWheelsDatabase } from '../scripts/updateHotWheelsDatabase';

/**
 * Actualiza la base de datos de Hot Wheels desde la Wiki de Fandom
 * Este endpoint solo debe ser accesible para administradores
 */
export const updateHotWheelsCatalog = async (req: Request, res: Response) => {
  try {
    // Verificar que sea admin (puedes agregar validación más estricta)
    console.log('🔄 Iniciando actualización de catálogo Hot Wheels...');

    // Ejecutar el script
    await updateHotWheelsDatabase();

    res.json({
      success: true,
      message: 'Catálogo de Hot Wheels actualizado exitosamente',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error actualizando catálogo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el catálogo: ' + error.message,
      error: error.message
    });
  }
};

/**
 * Obtiene el estado de la última actualización
 */
export const getUpdateStatus = async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const dbPath = path.join(__dirname, '../../data/hotwheels_database.json');
    const stats = fs.statSync(dbPath);

    res.json({
      success: true,
      lastModified: stats.mtime,
      size: stats.size,
      message: 'Estado del catálogo'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado: ' + error.message
    });
  }
};
