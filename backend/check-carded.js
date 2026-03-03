const mongoose = require('mongoose');
require('dotenv').config();
const { HotWheelsCarModel } = require('./dist/models/HotWheelsCar');

async function checkCarded() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Check if ANY item has photo_url_carded
        const count = await HotWheelsCarModel.countDocuments({
            photo_url_carded: { $exists: true, $ne: null, $ne: '' }
        });

        console.log('Items con photo_url_carded:', count);

        if (count > 0) {
            const example = await HotWheelsCarModel.findOne({
                photo_url_carded: { $exists: true, $ne: null, $ne: '' }
            }).lean();
            console.log('\n✅ Encontrado ejemplo:');
            console.log('   Modelo:', example.carModel);
            console.log('   Serie:', example.series);
            console.log('   Año:', example.year);
            console.log('   Loose: ✓');
            console.log('   Carded: ✓');
        } else {
            console.log('\n❌ Aún no hay items con photo_url_carded en la base de datos');
            console.log('\n✅ Esto es normal - necesitamos ejecutar el scraper nuevo');
            console.log('\n📝 Pasos:');
            console.log('   1. Eliminar archivo de progreso (ya hecho ✓)');
            console.log('   2. Ejecutar scraper: npm run update-catalog');
            console.log('\n⏳ El scraper tardará ~5-10 minutos');
            console.log('   Una vez completado, verás items con ambas fotos');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkCarded();
