const mongoose = require('mongoose');
require('dotenv').config();

async function checkItems() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Find delivery for Oswaldo Garcia with HSBC location
  const delivery = await db.collection('deliveries').findOne(
    { location: 'HSBC sahagun' }
  );
  
  if (!delivery) {
    console.log('❌ No delivery found');
    await mongoose.disconnect();
    return;
  }
  
  console.log('📦 Delivery found for:', delivery.location);
  console.log('Items count:', delivery.items.length);
  console.log('\n📦 Items in delivery:');
  delivery.items.forEach((item, idx) => {
    console.log(`${idx + 1}. carName: "${item.carName}", inventoryItemId: ${item.inventoryItemId}`);
  });
  
  // Now check inventory items directly
  console.log('\n🔍 Checking inventory items from database...');
  const inventoryItems = await db.collection('inventoryitems')
    .find({'brand': {$in: ['Kaido', 'Mini GT']}})
    .limit(5)
    .toArray();
  
  console.log('\n📊 Sample inventory items:');
  inventoryItems.forEach(item => {
    console.log(JSON.stringify({
      _id: item._id?.toString().slice(-8),
      carName: item.carName || 'MISSING',
      carId: item.carId,
      brand: item.brand,
      series: item.series || 'MISSING',
      color: item.color || 'MISSING'
    }, null, 2));
  });
  
  await mongoose.disconnect();
}

checkItems().catch(console.error);
