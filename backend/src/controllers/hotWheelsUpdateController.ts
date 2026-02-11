import { Request, Response } from 'express';
import scrapeIntelligent from '../scripts/scrape-intelligent';
import { refreshCache, getCacheStats } from '../services/hotWheelsCacheService';

/**
 * Actualiza la base de datos de Hot Wheels ejecutando el scraper inteligente
 * Los resultados se guardan en el JSON local y se refresca el cache en memoria
 * Este endpoint solo debe ser accesible para administradores
 */
export const updateHotWheelsCatalog = async (req: Request, res: Response) => {
  try {
    console.log('🔄 Iniciando actualización de catálogo Hot Wheels (scraper inteligente)...');

    // Run scraper without MongoDB (JSON only mode)
    const vehicles = await scrapeIntelligent(false);

    // Refresh the in-memory cache
    refreshCache();

    const stats = getCacheStats();

    res.json({
      success: true,
      message: `Catálogo actualizado: ${vehicles?.length || 0} vehículos scrapeados, ${stats.count} total en cache`,
      timestamp: new Date().toISOString(),
      stats: {
        scraped: vehicles?.length || 0,
        totalInCache: stats.count,
      }
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
    
    if (!fs.existsSync(dbPath)) {
      return res.json({
        success: true,
        lastModified: null,
        size: 0,
        message: 'No hay archivo de base de datos aún'
      });
    }

    const stats = fs.statSync(dbPath);
    const cacheStats = getCacheStats();

    res.json({
      success: true,
      lastModified: stats.mtime,
      size: stats.size,
      totalItems: cacheStats.count,
      cacheLoadedAt: cacheStats.lastLoadedAt,
      message: 'Estado del catálogo'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado: ' + error.message
    });
  }
};
