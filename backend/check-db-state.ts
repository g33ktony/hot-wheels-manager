import mongoose from 'mongoose';

async function check() {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI || 'mongodb://localhost/hot-wheels');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/hot-wheels');
    
    const db = mongoose.connection.db;
    console.log('Connected to database:', db.name);
    
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check all collections for items
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments({});
      console.log(`  ${col.name}: ${count} documents`);
    }
    
    // Check hotwheelscars with enrichment fields
    const enrichedCount = await db.collection('hotwheelscars').countDocuments({ colorGroup: { $exists: true } });
    console.log(`\nEnriched hotwheels cars: ${enrichedCount}`);
    
    // Check if table has ANY enrichment fields at all
    const withEnrichment = await db.collection('hotwheelscars').countDocuments({ 
      $or: [
        { colorGroup: { $exists: true } },
        { hwSeriesType: { $exists: true } },
        { photoValidation: { $exists: true } },
        { enrichmentMetadata: { $exists: true } }
      ]
    });
    console.log(`Items with any enrichment: ${withEnrichment}`);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

check();
