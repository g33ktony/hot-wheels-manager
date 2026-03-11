import mongoose from 'mongoose';
import { HotWheelsCarModel } from './src/models/HotWheelsCar';

async function test() {
  try {
    await mongoose.connect('mongodb://localhost/hot-wheels');
    
    // Check collection name
    console.log('Collection name:', HotWheelsCarModel.collection.name);
    console.log('Model name:', HotWheelsCarModel.modelName);
    console.log('DB name:', mongoose.connection.name);
    
    // Try inserting a test document
    const testDoc = {
      toy_num: 'TEST-' + Date.now(),
      carModel: 'Test Car',
      series: 'Test Series',
      colorGroup: 'Red',
      hwSeriesType: 'mainline'
    };
    
    const result = await HotWheelsCarModel.create(testDoc);
    console.log('✅ Inserted test doc:', result._id);
    
    // Verify it exists
    const count = await HotWheelsCarModel.countDocuments({});
    console.log('Total documents:', count);
    
    const found = await HotWheelsCarModel.findOne({ toy_num: testDoc.toy_num });
    console.log('Found doc:', found ? 'YES' : 'NO');
    
    // Check via raw MongoDB
    const raw = await mongoose.connection.db.collection('hotwheelscars').countDocuments({});
    console.log('Raw collection count:', raw);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

test();
