const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotweels';

async function testSaleStructure() {
  try {
    await mongoose.connect(uri);
    
    const db = mongoose.connection.db;
    const salesCollection = db.collection('sales');
    
    // Find a sale with customerId
    const sale = await salesCollection.findOne({ customerId: { $exists: true } });
    
    if (!sale) {
      console.log('No sales with customerId found');
      return;
    }
    
    console.log('📊 Raw sale from MongoDB:');
    console.log(`  _id: ${sale._id}`);
    console.log(`  customerId: ${sale.customerId}`);
    console.log(`  customerId type: ${typeof sale.customerId}`);
    console.log(`  customerId instanceof ObjectId: ${sale.customerId instanceof mongoose.Types.ObjectId}`);
    console.log(`  customerId.toString(): ${sale.customerId.toString()}`);
    console.log(`  totalAmount: $${sale.totalAmount}`);
    
    // Now test what happens after populate
    const SaleModel = require('./dist/models/Sale').SaleModel;
    
    const populatedSale = await SaleModel.findOne({ customerId: { $exists: true } })
      .populate('customerId', 'name email phone')
      .lean();
    
    if (populatedSale) {
      console.log('\n📊 Sale after .populate().lean():');
      console.log(`  customerId: ${JSON.stringify(populatedSale.customerId).substring(0, 100)}...`);
      console.log(`  customerId type: ${typeof populatedSale.customerId}`);
      if (typeof populatedSale.customerId === 'object') {
        console.log(`  customerId._id: ${populatedSale.customerId._id}`);
      }
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testSaleStructure();
