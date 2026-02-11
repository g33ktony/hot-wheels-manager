const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Find the delivery for Oswaldo Garcia
  const delivery = await db.collection('deliveries').findOne({
    customerName: /Oswaldo/i
  });
  
  if (!delivery) {
    console.log('No delivery found for Oswaldo Garcia');
    await mongoose.disconnect();
    return;
  }
  
  console.log('Delivery found:');
  console.log('Customer:', delivery.customerName);
  console.log('Scheduled Date:', delivery.scheduledDate);
  console.log('Items count:', delivery.items?.length || 0);
  console.log('Full delivery:');
  console.log(JSON.stringify(delivery, null, 2).substring(0, 2000));
  
  await mongoose.disconnect();
}

check().catch(console.error);
