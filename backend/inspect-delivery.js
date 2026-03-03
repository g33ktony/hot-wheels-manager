const mongoose = require('mongoose');
require('dotenv').config();

async function inspectDelivery() {
    await mongoose.connect(process.env.MONGODB_URI);
    const col = mongoose.connection.db.collection('deliveries');

    const all = await col.find({}).limit(1).toArray();
    if (all.length > 0) {
        const d = all[0];
        console.log('First delivery:');
        console.log('  _id:', d._id, '- type:', d._id.constructor.name);
        console.log('  customerId:', d.customerId, '- type:', typeof d.customerId);
        if (typeof d.customerId === 'object' && d.customerId !== null) {
            console.log('  customerId._id:', d.customerId._id, '- type:', d.customerId._id?.constructor?.name);
            console.log('  customerId keys:', Object.keys(d.customerId).slice(0, 5).join(', '));
        }
    }

    await mongoose.disconnect();
}

inspectDelivery().catch(err => { console.error(err); process.exit(1); });
