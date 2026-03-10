import mongoose from 'mongoose';

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/hot-wheels');
    
    const db = mongoose.connection.db;
    const collection = db.collection('hotwheelscars');
    
    const totalCount = await collection.countDocuments({});
    const enrichedCount = await collection.countDocuments({ colorGroup: { $exists: true } });
    
    console.log(`✅ Total items in MongoDB: ${totalCount}`);
    console.log(`✅ Items with colorGroup enrichment: ${enrichedCount}`);
    if (totalCount > 0) {
      console.log(`✅ Enrichment rate: ${((enrichedCount / totalCount) * 100).toFixed(2)}%`);
    }
    
    const sample = await collection.findOne({ colorGroup: { $exists: true } });
    if (sample) {
      console.log('\n📋 Sample enriched item:');
      console.log('  toy_num:', sample.toy_num);
      console.log('  carModel:', sample.carModel);
      console.log('  colorGroup:', sample.colorGroup);
      console.log('  colorHex:', sample.colorHex);
      console.log('  hwSeriesType:', sample.hwSeriesType);
      console.log('  photoValidation source:', sample.photoValidation?.source);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
};

connectMongo();
