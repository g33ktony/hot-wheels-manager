import { Request, Response } from 'express';
import scrapeIntelligent from '../scripts/scrape-intelligent';
import { refreshCache, getCacheStats, getAllCars } from '../services/hotWheelsCacheService';
import { HotWheelsCarModel } from '../models/HotWheelsCar';

/**
 * Sync the JSON cache data into MongoDB (bulk upsert)
 * This ensures MongoDB stays in sync with the scraped JSON data
 */
async function syncJSONToMongoDB(): Promise<{ synced: number; errors: number }> {
  const allCars = getAllCars();
  let synced = 0;
  let errors = 0;

  console.log(`🔄 Sincronizando ${allCars.length} vehículos del JSON a MongoDB...`);

  const batchSize = 100;
  for (let i = 0; i < allCars.length; i += batchSize) {
    const batch = allCars.slice(i, i + batchSize);
    const bulkOps = batch
      .filter(car => car.toy_num) // Only cars with toy_num can be upserted
      .map(car => ({
        updateOne: {
          filter: { toy_num: car.toy_num },
          update: {
            $set: {
              toy_num: car.toy_num,
              col_num: car.col_num || '',
              carModel: car.carModel || car.model || '',
              series: car.series || '',
              series_num: car.series_num || '',
              photo_url: car.photo_url || '',
              year: (car.year || '').toString(),
              color: car.color || '',
              tampo: car.tampo || '',
              wheel_type: car.wheel_type || '',
              car_make: car.car_make || '',
              segment: car.segment || '',
              country: car.country || '',
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));

    if (bulkOps.length === 0) continue;

    try {
      const result = await HotWheelsCarModel.bulkWrite(bulkOps, { ordered: false });
      synced += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    } catch (error: any) {
      console.error(`  ❌ Error en lote ${i}-${i + batchSize}:`, error.message);
      errors += batch.length;
    }
  }

  console.log(`✅ Sincronización MongoDB completada: ${synced} actualizados/insertados, ${errors} errores`);
  return { synced, errors };
}

/**
 * Actualiza la base de datos de Hot Wheels ejecutando el scraper inteligente
 * Los resultados se guardan en el JSON local, se refresca el cache en memoria,
 * y se sincronizan a MongoDB
 * Este endpoint solo debe ser accesible para administradores
 */
export const updateHotWheelsCatalog = async (req: Request, res: Response) => {
  try {
    console.log('🔄 Iniciando actualización de catálogo Hot Wheels (scraper inteligente)...');

    // Run scraper without MongoDB direct writes (JSON only mode)
    // The scraper merges into JSON and refreshes cache internally
    const vehicles = await scrapeIntelligent(false);

    // Refresh the in-memory cache to pick up merged data
    refreshCache();

    // Sync the updated JSON data into MongoDB
    const mongoResult = await syncJSONToMongoDB();

    const stats = getCacheStats();
    const totalInMongo = await HotWheelsCarModel.countDocuments();

    res.json({
      success: true,
      message: `Catálogo actualizado: ${vehicles?.length || 0} scrapeados, ${stats.count} en cache, ${totalInMongo} en MongoDB`,
      timestamp: new Date().toISOString(),
      stats: {
        scraped: vehicles?.length || 0,
        totalInCache: stats.count,
        totalInMongo,
        mongoSynced: mongoResult.synced,
        mongoErrors: mongoResult.errors,
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
