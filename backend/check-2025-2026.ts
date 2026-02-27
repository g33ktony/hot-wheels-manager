import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HotWheelsCarModel } from './src/models/HotWheelsCar';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const count2025 = await HotWheelsCarModel.countDocuments({ year: '2025' });
  const count2026 = await HotWheelsCarModel.countDocuments({ year: '2026' });
  const countWithCarded = await HotWheelsCarModel.countDocuments({ 
    photo_url_carded: { $exists: true, $ne: null } 
  });
  
  console.log('📊 AUTOS EN BASE DE DATOS:');
  console.log('   2025: ' + count2025);
  console.log('   2026: ' + count2026);
  console.log('   Con foto_url_carded: ' + countWithCarded);
  
  await mongoose.disconnect();
}

check().catch(console.error);
