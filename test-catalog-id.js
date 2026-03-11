const mongoose = require('mongoose');
const connStr = 'mongodb://mongo:railway@switchyard.proxy.rlwy.net:42764/railway?authSource=admin';

async function test() {
  await mongoose.connect(connStr, { ssl: true, retryWrites: true });
  const db = mongoose.connection.db;
  
  // Get first report
  const report = await db.collection('datareports').findOne({});
  if (!report) {
    console.log('No data reports found');
    mongoose.disconnect();
    return;
  }
  
  console.log('DataReport catalogItemId:', report.catalogItemId);
  console.log('Type:', typeof report.catalogItemId);
  
  // Try to find the item
  try {
    const oid = new mongoose.Types.ObjectId(report.catalogItemId);
    console.log('Converted to ObjectId:', oid.toString());
    
    const item = await db.collection('hotwheelscars').findOne({ _id: oid });
    console.log('Found item:', item ? 'YES' : 'NO');
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  mongoose.disconnect();
}

test().catch(e => console.error(e));
