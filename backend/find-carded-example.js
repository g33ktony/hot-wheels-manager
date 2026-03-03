const mongoose = require('mongoose');

(async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels';
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

        const carSchema = new mongoose.Schema({}, { strict: false });
        const HotWheelsCar = mongoose.model('HotWheelsCar', carSchema, 'hotwheelscars');

        const item = await HotWheelsCar.findOne({
            photo_url_carded: { $ne: null, $ne: '' }
        });

        if (item) {
            console.log('✅ Ejemplo encontrado:\n');
            console.log('Nombre:', item.name);
            console.log('Año:', item.year);
            console.log('Serie:', item.series);
            console.log('\n📸 Foto Loose:', item.photo_url ? item.photo_url.substring(0, 110) + '...' : 'No tiene');
            console.log('\n📦 Foto Carded:', item.photo_url_carded ? item.photo_url_carded.substring(0, 110) + '...' : 'No tiene');
        } else {
            const total = await HotWheelsCar.countDocuments();
            const withCarded = await HotWheelsCar.countDocuments({
                photo_url_carded: { $ne: null, $ne: '' }
            });
            console.log('❌ No se encontraron items con photo_url_carded');
            console.log('Total items:', total);
            console.log('Items con photo_url_carded:', withCarded);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
