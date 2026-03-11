import fs from 'fs';
import mongoose from 'mongoose';
import CatalogClassificationService from './src/services/catalogClassificationService';
import CatalogPhotoService from './src/services/catalogPhotoService';

const items = JSON.parse(fs.readFileSync('data/hotwheels_database.json', 'utf-8'));

// Create a few enriched items to test schema
const testItems = items.slice(0, 3).map((item: any) => ({
  ...item,
  colorGroup: 'Red',
  colorVariant: 'Solid',
  colorHex: '#FF0000',
  hwSeriesType: 'mainline',
  seriesPosition: 1,
  yearPosition: 1,
  photoValidation: {
    source: 'main' as const,
    url: item.photo_url,
    cardedValidated: false
  },
  enrichmentMetadata: {
    dataQuality: 'high' as const,
    issues: []
  }
}));

console.log('Sample enriched item:');
console.log(JSON.stringify(testItems[0], null, 2).substring(0, 500));

// Try to validate against schema
(async () => {
  try {
    await mongoose.connect('mongodb://localhost/hot-wheels');
    
    const { HotWheelsCarModel } = await import('./src/models/HotWheelsCar');
    
    // Clear first
    await HotWheelsCarModel.deleteMany({});
    
    // Try to insert
    const result = await HotWheelsCarModel.insertMany(testItems, { ordered: false });
    console.log(`\n✅ Inserted ${result.length} test items`);
    
    // Verify
    const count = await HotWheelsCarModel.countDocuments({});
    const enrichedCount = await HotWheelsCarModel.countDocuments({ colorGroup: { $exists: true } });
    console.log(`Total: ${count}, Enriched: ${enrichedCount}`);
    
    process.exit(0);
  } catch (e: any) {
    console.error('Error:', e.message);
    if (e.writeErrors) {
      console.error('Write errors:', e.writeErrors.map((e: any) => e.errmsg).slice(0, 3));
    }
    process.exit(1);
  }
})();
