const mongoose = require('mongoose');
require('dotenv').config();

async function fixDeliveries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const deliveries = db.collection('deliveries');
    const inventoryItems = db.collection('inventoryitems');
    
    // Get all deliveries
    const allDeliveries = await deliveries.find({}).toArray();
    console.log(`📦 Found ${allDeliveries.length} deliveries to process\n`);
    
    let updated = 0;
    let itemsEnriched = 0;
    
    for (const delivery of allDeliveries) {
      let needsUpdate = false;
      const updatedItems = [];
      
      for (const item of delivery.items) {
        let updatedItem = { ...item };
        
        // Only process inventory items (not presale items)
        if (item.inventoryItemId && !item.inventoryItemId.toString().startsWith('presale_')) {
          try {
            const invItem = await inventoryItems.findOne({
              _id: new mongoose.Types.ObjectId(item.inventoryItemId)
            });
            
            if (invItem) {
              // Update carId if missing
              if (!updatedItem.carId || updatedItem.carId === 'Unknown') {
                updatedItem.carId = invItem.carId || item.carId;
                if (invItem.carId !== item.carId) {
                  console.log(`  ✏️  Updated carId: ${item.carId} → ${invItem.carId}`);
                  needsUpdate = true;
                }
              }
              
              // Update carName if it's just brand - Unknown
              if (!updatedItem.carName || updatedItem.carName === `${updatedItem.brand} - Unknown` || updatedItem.carName.endsWith('- Unknown')) {
                updatedItem.carName = invItem.carName || invItem.carId || updatedItem.carName;
                if (updatedItem.carName !== item.carName) {
                  needsUpdate = true;
                }
              }
              
              // Update photos if missing
              if (!updatedItem.photos || updatedItem.photos.length === 0) {
                if (invItem.photos && invItem.photos.length > 0) {
                  updatedItem.photos = invItem.photos;
                  console.log(`  📸 Added ${invItem.photos.length} photos`);
                  needsUpdate = true;
                  itemsEnriched++;
                }
              }
              
              // Add primaryPhotoIndex if missing
              if (!updatedItem.primaryPhotoIndex && invItem.primaryPhotoIndex !== undefined) {
                updatedItem.primaryPhotoIndex = invItem.primaryPhotoIndex || 0;
                needsUpdate = true;
              }
            }
          } catch (err) {
            console.error(`  ❌ Error processing item: ${err.message}`);
          }
        }
        
        updatedItems.push(updatedItem);
      }
      
      // Update delivery if any changes were made
      if (needsUpdate) {
        await deliveries.updateOne(
          { _id: delivery._id },
          { $set: { items: updatedItems } }
        );
        updated++;
        console.log(`✅ Updated delivery: ${delivery.location || 'Sin ubicación'}`);
        console.log('');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Deliveries updated: ${updated}/${allDeliveries.length}`);
    console.log(`   Items enriched with photos: ${itemsEnriched}`);
    console.log('='.repeat(60));
    
    await mongoose.disconnect();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDeliveries();
