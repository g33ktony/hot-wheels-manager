const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotweels';
console.log('🔗 Connecting to:', uri.replace(/:[^:]*@/, ':****@'));

async function checkSales() {
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    const sales = await db.collection('sales').find({}).toArray();
    console.log(`\n📊 Total sales: ${sales.length}`);
    
    // Check sales without customerId - are they POS sales?
    const noCustId = sales.filter(s => !s.customerId);
    console.log(`\n⚠️  Sales WITHOUT customerId: ${noCustId.length}`);
    
    // Check what's different about them
    console.log(`   Sample sale without customerId:`);
    if (noCustId[0]) {
      console.log(`     _id: ${noCustId[0]._id}`);
      console.log(`     deliveryId: ${noCustId[0].deliveryId}`);
      console.log(`     saleType: ${noCustId[0].saleType}`);
      console.log(`     items: ${noCustId[0].items?.length || 0}`);
      console.log(`     status: ${noCustId[0].status}`);
    }
    
    // Count by saleType
    const posSales = sales.filter(s => s.saleType === 'pos');
    const deliverySales = sales.filter(s => s.saleType === 'delivery');
    console.log(`\n📊 Sale types:`);
    console.log(`   POS sales: ${posSales.length}`);
    console.log(`   Delivery sales: ${deliverySales.length}`);
    
    // Check delivery sales - do they all have customerId?
    const deliveryWithCustId = deliverySales.filter(s => s.customerId);
    const deliveryWithoutCustId = deliverySales.filter(s => !s.customerId);
    console.log(`\n📊 Delivery sales:`);
    console.log(`   With customerId: ${deliveryWithCustId.length}`);
    console.log(`   Without customerId: ${deliveryWithoutCustId.length}`);
    
    // Check the customer specifically
    const jesusPavonId = new mongoose.Types.ObjectId('696ae633306de91ee686a76f7');
    const jesusSales = sales.filter(s => s.customerId?.equals(jesusPavonId));
    console.log(`\n👤 Jesus pavon sales: ${jesusSales.length}`);
    jesusSales.forEach((s, i) => {
      console.log(`   Sale ${i + 1}: $${s.totalAmount} (${s.saleType})`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSales();
