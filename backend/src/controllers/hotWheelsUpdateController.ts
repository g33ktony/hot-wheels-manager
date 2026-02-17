import { Request, Response } from 'express';
import scrapeIntelligent from '../scripts/scrape-intelligent';
import scrapeAmazonPremiumBrands from '../scripts/scrape-amazon-premium-brands';
import { refreshCache, getCacheStats, getAllCars } from '../services/hotWheelsCacheService';
import { HotWheelsCarModel } from '../models/HotWheelsCar';

// Estado global para el progreso
interface UpdateProgress {
  isUpdating: boolean;
  step: 'idle' | 'scraping-hotwheels' | 'scraping-premium' | 'syncing' | 'completed' | 'error';
  percent: number;
  message: string;
  startTime: string | null;
  itemsProcessed: number;
  itemTotal: number;
  lastError: string | null;
  itemsAdded: number;
  itemsUpdated: number;
}

let currentUpdateProgress: UpdateProgress = {
  isUpdating: false,
  step: 'idle',
  percent: 0,
  message: 'Listo',
  startTime: null,
  itemsProcessed: 0,
  itemTotal: 0,
  lastError: null,
  itemsAdded: 0,
  itemsUpdated: 0
};

/**
 * Sync the JSON cache data into MongoDB (bulk upsert with update support)
 * This ensures MongoDB stays in sync with the scraped JSON data
 * Updates existing items if photo_url or other fields are different
 */
async function syncJSONToMongoDB(): Promise<{ synced: number; added: number; updated: number; errors: number }> {
  const allCars = getAllCars();
  let added = 0;
  let updated = 0;
  let errors = 0;

  console.log(`🔄 Sincronizando ${allCars.length} vehículos del JSON a MongoDB...`);

  currentUpdateProgress.step = 'syncing';
  currentUpdateProgress.itemTotal = allCars.length;
  currentUpdateProgress.itemsProcessed = 0;

  const batchSize = 500;
  for (let i = 0; i < allCars.length; i += batchSize) {
    const batch = allCars.slice(i, i + batchSize);
    
    // Update progress
    currentUpdateProgress.itemsProcessed = i + batch.length;
    currentUpdateProgress.percent = 70 + Math.round(((i + batch.length) / allCars.length) * 30); // Sync is last 30%
    currentUpdateProgress.message = `Sincronizando con base de datos (${currentUpdateProgress.itemsProcessed}/${allCars.length})...`;

    const bulkOps = batch
      .filter(car => car.carModel) // Need at least a name
      .map(car => {
        const filterKey = car.toy_num
          ? { toy_num: car.toy_num }
          : { carModel: car.carModel, year: (car.year || '').toString(), series: car.series || '' };

        return {
          updateOne: {
            filter: filterKey,
            update: {
              $set: {
                toy_num: car.toy_num || '',
                col_num: car.col_num || '',
                carModel: car.carModel || '',
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
                brand: car.brand || 'Hot Wheels', // Include brand field
              },
              $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
          },
        };
      });

    if (bulkOps.length === 0) continue;

    try {
      const result = await HotWheelsCarModel.bulkWrite(bulkOps, { ordered: false });
      const itemsCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      added += result.upsertedCount || 0;
      updated += result.modifiedCount || 0;
      
      currentUpdateProgress.itemsAdded = added;
      currentUpdateProgress.itemsUpdated = updated;
    } catch (error: any) {
      console.error(`  ❌ Error en lote ${i}-${i + batchSize}:`, error.message);
      errors += batch.length;
    }
  }

  console.log(`✅ Sincronización MongoDB completada: ${added} nuevos, ${updated} actualizados, ${errors} errores`);
  return { synced: added + updated, added, updated, errors };
}

/**
 * Actualiza la base de datos de Hot Wheels ejecutando ambos scrapers:
 * 1. Scraper inteligente (Hot Wheels Fandom)
 * 2. Scraper Amazon.jp (Marcas Premium)
 * Los resultados se guardan en el JSON local, se refresca el cache en memoria,
 * y se sincronizan a MongoDB con soporte para UPDATE
 * Este endpoint solo debe ser accesible para administradores
 */
export const updateHotWheelsCatalog = async (req: Request, res: Response) => {
  if (currentUpdateProgress.isUpdating) {
    return res.status(409).json({
      success: false,
      message: 'Ya hay una actualización en curso',
      progress: currentUpdateProgress
    });
  }

  // Iniciamos el proceso en segundo plano
  // No usamos await aquí para retornar rápido al cliente y evitar que ocurra un timeout
  startBackgroundUpdate();

  res.json({
    success: true,
    message: 'Actualización iniciada en segundo plano (Hot Wheels + Marcas Premium)',
    progress: currentUpdateProgress
  });
};

/**
 * Lógica interna para la actualización en segundo plano
 */
async function startBackgroundUpdate() {
  try {
    currentUpdateProgress = {
      isUpdating: true,
      step: 'scraping-hotwheels',
      percent: 0,
      message: 'Iniciando scraper Hot Wheels (Fandom)...',
      startTime: new Date().toISOString(),
      itemsProcessed: 0,
      itemTotal: 0,
      lastError: null,
      itemsAdded: 0,
      itemsUpdated: 0
    };

    console.log('🔄 Iniciando actualización de catálogo Hot Wheels (ambos scrapers)...');

    // ===== PHASE 1: Hot Wheels Fandom Scraper (0-40%) =====
    console.log('\n📖 FASE 1: Scrapeando Fandom Hot Wheels...');
    await scrapeIntelligent(false, (progress) => {
      currentUpdateProgress.percent = Math.round(progress.percent * 0.4); // First 40%
      currentUpdateProgress.message = progress.message;
      currentUpdateProgress.itemsProcessed = progress.current;
      currentUpdateProgress.itemTotal = progress.total;
    });

    // ===== PHASE 2: Amazon Premium Brands Scraper (40-70%) =====
    console.log('\n🛒 FASE 2: Scrapeando Amazon.jp (Marcas Premium)...');
    currentUpdateProgress.step = 'scraping-premium';
    await scrapeAmazonPremiumBrands((progress) => {
      currentUpdateProgress.percent = 40 + Math.round(progress.percent * 0.3); // Shift to 40-70%
      currentUpdateProgress.message = progress.message;
      currentUpdateProgress.itemsProcessed = progress.current;
      currentUpdateProgress.itemTotal = progress.total;
    });

    // Refresh the in-memory cache to pick up merged data from both scrapers
    refreshCache();

    // ===== PHASE 3: Sync to MongoDB (70-100%) =====
    console.log('\n🔗 FASE 3: Sincronizando a MongoDB...');
    const syncResult = await syncJSONToMongoDB();

    currentUpdateProgress.isUpdating = false;
    currentUpdateProgress.step = 'completed';
    currentUpdateProgress.percent = 100;
    currentUpdateProgress.message = `✅ Actualización completada: ${syncResult.added} nuevos + ${syncResult.updated} actualizados`;
    
    console.log(`\n✅ PROCESO COMPLETO - Añadidos: ${syncResult.added}, Actualizados: ${syncResult.updated}`);
    
  } catch (error: any) {
    console.error('❌ Error en actualización en segundo plano:', error);
    currentUpdateProgress.isUpdating = false;
    currentUpdateProgress.step = 'error';
    currentUpdateProgress.lastError = error.message;
    currentUpdateProgress.message = 'Error: ' + error.message;
  }
}

/**
 * Obtiene el estado de la última actualización
 */
export const getUpdateStatus = async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Si hay una actualización en curso, retornamos el progreso real
    if (currentUpdateProgress.isUpdating || currentUpdateProgress.step === 'completed' || currentUpdateProgress.step === 'error') {
      // Si ya terminó y el cliente pidió el status, después de enviarlo podemos resetear a idle
      // pero por ahora lo dejamos así para que el frontend vea el 100%
      const response = {
        success: true,
        progress: currentUpdateProgress,
        message: currentUpdateProgress.message
      };
      
      // Auto-reset if it was in final state so next time it shows standard file info
      if (currentUpdateProgress.step === 'completed' || currentUpdateProgress.step === 'error') {
        setTimeout(() => {
          if (!currentUpdateProgress.isUpdating) {
            currentUpdateProgress.step = 'idle';
          }
        }, 10000);
      }
      
      return res.json(response);
    }

    const dbPath = path.join(__dirname, '../../data/hotwheels_database.json');
    
    if (!fs.existsSync(dbPath)) {
      return res.json({
        success: true,
        lastModified: null,
        size: 0,
        progress: currentUpdateProgress,
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
      progress: currentUpdateProgress,
      message: 'Estado del catálogo'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado: ' + error.message
    });
  }
};

