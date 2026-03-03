#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function findCardedPhotosExample() {
    try {
        // Import model
        const { HotWheelsCarModel } = require('./dist/models/HotWheelsCar');

        console.log('🔍 Buscando ejemplos de items con photo_url_carded...\n');

        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels');

        // Find items with both photos
        const itemsWithCarded = await HotWheelsCarModel.find({
            photo_url_carded: { $exists: true, $ne: null },
            photo_url: { $exists: true, $ne: null }
        }).lean().limit(10);

        if (!itemsWithCarded || itemsWithCarded.length === 0) {
            console.log('❌ No hay items con photo_url_carded aún.');
            console.log('\n📝 Instrucciones:');
            console.log('1. El scraper aún no ha extraído las fotos carded');
            console.log('2. Necesitamos ejecutar el scraper completo con la nueva función extractImages()');
            console.log('3. Comando: npm run update-catalog (desde la raíz del proyecto)');
            console.log('\n💡 Una vez completado, volverá a ejecutar este script y verás ejemplos.');
            await mongoose.disconnect();
            process.exit(0);
        }

        console.log(`✅ Encontrados ${itemsWithCarded.length} items con foto carded:\n`);

        itemsWithCarded.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.carModel || item.toy_num}`);
            console.log(`   📦 Series: ${item.series}`);
            console.log(`   📅 Año: ${item.year}`);
            console.log(`   🔗 ID: ${item._id}`);
            console.log(`   📷 Loose: ${item.photo_url ? '✓' : '✗'}`);
            console.log(`   📦 Carded: ${item.photo_url_carded ? '✓' : '✗'}`);
            console.log('');
        });

        // Also show example for catalog
        console.log('📝 Para ver estos items en el detalle:');
        console.log('1. Ingresa al inventario desde el dashboard');
        console.log('2. Busca cualquiera de los modelos listados arriba');
        console.log('3. Haz click en "Ampliar imagen" para ver ambas fotos');
        console.log('4. Usa las flechas para navegar entre Loose y Carded\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

findCardedPhotosExample();
