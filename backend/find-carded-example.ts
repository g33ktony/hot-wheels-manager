import mongoose from 'mongoose';
import { HotWheelsCar } from './src/models/HotWheelsCar';

async function findExample() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels';
    await mongoose.connect(mongoUri);
    
    // Find an item with photo_url_carded
    const item = await HotWheelsCar.findOne({ 
      photo_url_carded: { $ne: null, $ne: '' } 
    }).lean();
    
    if (item) {
      console.log('✅ Ejemplo encontrado:\n');
      console.log('Nombre:', item.name);
      console.log('Año:', item.year);
      console.log('Serie:', item.series);
      console.log('\n📸 Foto Loose (Inventario):', item.photo_url || 'No tiene');
      console.log('\n📦 Foto Carded:', item.photo_url_carded || 'No tiene');
    } else {
      // Get stats
      const total = await HotWheelsCar.countDocuments();
      const withCarded = await HotWheelsCar.countDocuments({ 
        photo_url_carded: { $ne: null, $ne: '' } 
      });
      console.log('❌ No se encontraron items con photo_url_carded');
      console.log(`\nTotal items: ${total}`);
      console.log(`Items con photo_url_carded: ${withCarded}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }
}

findExample();
