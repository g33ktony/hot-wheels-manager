/**
 * Script de Migración: Corregir Desfase de Fechas Histórico
 * 
 * Ejecuta automáticamente:
 * 1. Verifica conexión a MongoDB (Railway o Local)
 * 2. Hace backup automático
 * 3. Corrige fechas con desfase de 6 horas en:
 *    - Deliveries (scheduledDate, completedDate, payments)
 *    - Sales (saleDate, paymentHistory)
 *    - PendingItems (reportedDate)
 *    - Purchases (dates)
 * 
 * USO:
 *   npm run fix:dates:preview    (ver qué cambiaría - SIN CAMBIOS)
 *   npm run fix:dates            (ejecutar cambios reales)
 */

import mongoose from 'mongoose';
import { DeliveryModel } from '../models/Delivery';
import { SaleModel } from '../models/Sale';
import { PendingItemModel } from '../models/PendingItem';
import Purchase from '../models/Purchase';
import * as fs from 'fs';
import * as path from 'path';

// Constante: 6 horas en milisegundos (UTC-6 para México)
const TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000;

// Determinar modo de ejecución
const mode = process.argv[2] === '--fix' ? 'fix' : 'preview';
const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME !== undefined;

async function runMigration() {
  try {
    console.log('\n🔧 HOT WHEELS MANAGER - Corrección de Fechas');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`📝 Modo: ${mode === 'fix' ? '🔧 FIX (cambios reales)' : '👁️ PREVIEW (solo visualización)'}`);
    console.log(`🚂 Entorno: ${isRailway ? '🚂 Railway' : '💻 Local'}\n`);
    
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/hot-wheels-manager';
    console.log('🔗 Conectando a MongoDB...');
    
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ Conectado exitosamente\n');
    } catch (error) {
      console.error('❌ No se pudo conectar a MongoDB');
      console.error('   Verifica que MONGODB_URI o DATABASE_URL esté configurado');
      process.exit(1);
    }

    // Hacer backup automático si es fix
    if (mode === 'fix') {
      await createBackup();
    }

    // 1. Corregir Deliveries
    console.log('📦 Analizando Deliveries...');
    const deliveryResult = await fixDeliveryDates();
    console.log(`   ✅ ${deliveryResult.count} entregas ${mode === 'fix' ? 'corregidas' : 'con cambios identificadas'}\n`);

    // 2. Corregir Sales
    console.log('💰 Analizando Sales...');
    const salesResult = await fixSaleDates();
    console.log(`   ✅ ${salesResult.count} ventas ${mode === 'fix' ? 'corregidas' : 'con cambios identificadas'}\n`);

    // 3. Corregir PendingItems
    console.log('⏳ Analizando PendingItems...');
    const pendingResult = await fixPendingItemDates();
    console.log(`   ✅ ${pendingResult.count} items pendientes ${mode === 'fix' ? 'corregidos' : 'con cambios identificados'}\n`);

    // 4. Corregir Purchases
    console.log('📋 Analizando Purchases...');
    const purchaseResult = await fixPurchaseDates();
    console.log(`   ✅ ${purchaseResult.count} compras ${mode === 'fix' ? 'corregidas' : 'con cambios identificadas'}\n`);

    // Resumen
    const totalCount = 
      deliveryResult.count + 
      salesResult.count + 
      pendingResult.count + 
      purchaseResult.count;

    console.log('═══════════════════════════════════════════════════');
    if (mode === 'fix') {
      console.log('✅ MIGRACIÓN COMPLETADA CON ÉXITO');
    } else {
      console.log('📋 ANÁLISIS COMPLETADO');
    }
    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 Total de registros afectados: ${totalCount}`);
    console.log(`   • Entregas: ${deliveryResult.count}`);
    console.log(`   • Ventas: ${salesResult.count}`);
    console.log(`   • Items Pendientes: ${pendingResult.count}`);
    console.log(`   • Compras: ${purchaseResult.count}`);
    
    if (mode === 'preview' && totalCount > 0) {
      console.log('\n💡 Para ejecutar los cambios reales, usa:');
      console.log('   npm run fix:dates');
    }
    
    if (mode === 'fix' && totalCount > 0) {
      console.log('\n✨ Las fechas han sido corregidas exitosamente');
      console.log('   Verifica que los datos se muestren correctamente en:');
      console.log('   • /dashboard (Entregas del Día)');
      console.log('   • /deliveries (Fechas de entregas)');
      console.log('   • /sales (Fechas de ventas)');
    }
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

/**
 * Crea backup automático de la BD
 */
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('💾 Creando backup automático...');
    
    // Exportar colecciones principales
    const collections = ['deliveries', 'sales', 'pending_items', 'purchases'];
    const db = mongoose.connection.db;
    
    for (const collectionName of collections) {
      try {
        const collection = db!.collection(collectionName);
        const docs = await collection.find({}).toArray();
        
        if (docs.length > 0) {
          const backupFile = path.join(backupDir, `${collectionName}_${timestamp}.json`);
          fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));
          console.log(`   ✅ ${collectionName}: ${docs.length} documentos guardados`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${collectionName}: no encontrada (normal si está vacía)`);
      }
    }
    
    console.log(`\n📂 Backup guardado en: ./backups/\n`);
  } catch (error) {
    console.warn('⚠️  No se pudo crear backup automático, continuando...\n');
  }
}

/**
 * Corrige fechas en Deliveries
 */
async function fixDeliveryDates() {
  const deliveries = await DeliveryModel.find({});
  let count = 0;

  for (const delivery of deliveries) {
    let hasChanges = false;

    // Corregir scheduledDate
    if (delivery.scheduledDate) {
      const currentDate = delivery.scheduledDate;
      const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
      if (newDate.getTime() !== currentDate.getTime()) {
        if (mode === 'fix') {
          delivery.scheduledDate = newDate;
        }
        hasChanges = true;
      }
    }

    // Corregir completedDate
    if (delivery.completedDate) {
      const currentDate = delivery.completedDate;
      const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
      if (newDate.getTime() !== currentDate.getTime()) {
        if (mode === 'fix') {
          delivery.completedDate = newDate;
        }
        hasChanges = true;
      }
    }

    // Corregir payments[].paymentDate
    if (delivery.payments && delivery.payments.length > 0) {
      for (let i = 0; i < delivery.payments.length; i++) {
        const payment = delivery.payments[i];
        if (payment.paymentDate) {
          const currentDate = payment.paymentDate;
          const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
          if (newDate.getTime() !== currentDate.getTime()) {
            if (mode === 'fix') {
              delivery.payments[i].paymentDate = newDate;
            }
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      if (mode === 'fix') {
        await delivery.save();
      }
      count++;
    }
  }

  return { count };
}

/**
 * Corrige fechas en Sales
 */
async function fixSaleDates() {
  const sales = await SaleModel.find({});
  let count = 0;

  for (const sale of sales) {
    let hasChanges = false;

    // Corregir saleDate
    if (sale.saleDate) {
      const currentDate = sale.saleDate;
      const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
      if (newDate.getTime() !== currentDate.getTime()) {
        if (mode === 'fix') {
          (sale as any).saleDate = newDate;
        }
        hasChanges = true;
      }
    }

    // Corregir paymentHistory[].date si existe
    if ((sale as any).paymentHistory && (sale as any).paymentHistory.length > 0) {
      for (let i = 0; i < (sale as any).paymentHistory.length; i++) {
        const payment = (sale as any).paymentHistory[i];
        if (payment.date) {
          const currentDate = payment.date;
          const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
          if (newDate.getTime() !== currentDate.getTime()) {
            if (mode === 'fix') {
              (sale as any).paymentHistory[i].date = newDate;
            }
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      if (mode === 'fix') {
        await sale.save();
      }
      count++;
    }
  }

  return { count };
}

/**
 * Corrige fechas en PendingItems
 */
async function fixPendingItemDates() {
  const pendingItems = await PendingItemModel.find({});
  let count = 0;

  for (const item of pendingItems) {
    // Corregir reportedDate
    if (item.reportedDate) {
      const currentDate = item.reportedDate;
      const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
      if (newDate.getTime() !== currentDate.getTime()) {
        if (mode === 'fix') {
          item.reportedDate = newDate;
          await item.save();
        }
        count++;
      }
    }
  }

  return { count };
}

/**
 * Corrige fechas en Purchases
 */
async function fixPurchaseDates() {
  const purchases = await Purchase.find({});
  let count = 0;

  for (const purchase of purchases) {
    let hasChanges = false;

    // Corregir purchaseDate
    if ((purchase as any).purchaseDate) {
      const currentDate = (purchase as any).purchaseDate;
      const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
      if (newDate.getTime() !== currentDate.getTime()) {
        hasChanges = true;
        if (mode === 'fix') {
          (purchase as any).purchaseDate = newDate;
        }
      }
    }

    // Corregir deliveryDate
    if ((purchase as any).deliveryDate) {
      const currentDate = (purchase as any).deliveryDate;
      const newDate = new Date(currentDate.getTime() - TIMEZONE_OFFSET_MS);
      if (newDate.getTime() !== currentDate.getTime()) {
        hasChanges = true;
        if (mode === 'fix') {
          (purchase as any).deliveryDate = newDate;
        }
      }
    }

    if (hasChanges && mode === 'fix') {
      await Purchase.updateOne(
        { _id: purchase._id },
        {
          $set: {
            purchaseDate: (purchase as any).purchaseDate,
            deliveryDate: (purchase as any).deliveryDate,
          }
        }
      );
      count++;
    } else if (hasChanges) {
      count++;
    }
  }

  return { count };
}

// Ejecutar
if (require.main === module) {
  runMigration();
}

export { runMigration };
