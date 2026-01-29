import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const HotWheelsCarSchema = new mongoose.Schema({
  toy_num: String,
  col_num: String,
  model: String,
  series: String,
  series_num: String,
  photo_url: String,
  year: String,
  color: String,
  tampo: String,
  wheel_type: String,
  car_make: String
}, { collection: 'hotwheelscars' });

async function loadCatalog() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set in .env');
      process.exit(1);
    }

    console.log('🔗 Conectando a MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado');

    const HotWheelsCarModel = mongoose.model('HotWheelsCar', HotWheelsCarSchema);

    // Read the JSON file
    const jsonPath = path.join(__dirname, '../../data/hotwheels_database.json');
    console.log(`📖 Leyendo datos desde: ${jsonPath}`);
    
    let jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    // Filter out header row if it exists (first row with 'Toy #' as toy_num)
    jsonData = jsonData.filter((item: any) => item.toy_num && item.toy_num !== 'Toy #');
    
    console.log(`📊 Total de carros en JSON: ${jsonData.length}`);

    // Clear existing catalog
    const deleted = await HotWheelsCarModel.deleteMany({});
    console.log(`🗑️  Registros previos eliminados: ${deleted.deletedCount}`);

    // Insert new data with ordered: false to skip duplicates
    try {
      const inserted = await HotWheelsCarModel.insertMany(jsonData, { ordered: false });
      console.log(`✅ Carros importados: ${inserted.length}`);
    } catch (err: any) {
      // insertMany with ordered: false throws but still inserts what it can
      if (err.insertedDocs) {
        console.log(`✅ Carros importados (con errores ignorados): ${err.insertedDocs.length}`);
      } else {
        throw err;
      }
    }

    // Verify
    const count = await HotWheelsCarModel.countDocuments();
    console.log(`📈 Total actual en base: ${count}`);

    // Show sample
    const sample = await HotWheelsCarModel.findOne({}).lean();
    if (sample) {
      console.log('📋 Ejemplo de documento:');
      console.log(JSON.stringify(sample, null, 2).substring(0, 300) + '...');
    }

    console.log('✨ Catálogo cargado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

loadCatalog();
