const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const col = mongoose.connection.db.collection('deliveries');

    // Get all deliveries and fix customerId to be just the _id from the customer object
    const result = await col.updateMany(
        { 'customerId._id': { $exists: true } },
        [{ $set: { customerId: '$customerId._id' } }]
    );

    console.log('Updated:', result.modifiedCount);
    console.log('✅ All customerId fields restored to ObjectId');

    await mongoose.disconnect();
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
