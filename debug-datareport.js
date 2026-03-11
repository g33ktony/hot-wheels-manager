const mongoose = require('mongoose');
const connStr = 'mongodb://mongo:railway@switchyard.proxy.rlwy.net:42764/railway?authSource=admin';

mongoose.connect(connStr, { ssl: true, retryWrites: true }).then(async () => {
  const db = mongoose.connection.db;
  const report = await db.collection('datareports').findOne({});
  console.log('Sample DataReport:', JSON.stringify(report, null, 2));
  
  if (report && report.catalogItemId) {
    try {
      const item = await db.collection('hotwheelscars').findOne({
        _id: new mongoose.Types.ObjectId(report.catalogItemId)
      });
      console.log('Item found:', item ? 'YES' : 'NO');
      if (item) console.log('Item model:', item.carModel);
    } catch (e) {
      console.log('Error converting catalogItemId to ObjectId:', e.message);
    }
  }
  
  mongoose.disconnect();
}).catch(e => console.error('Connection error:', e.message));
