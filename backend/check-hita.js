const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const items = await db.collection('inventoryitems').find({
        storeId: '69a0904dc42bf514272683df'
    }).toArray();

    console.log('📋 Items de Hita Santos (3 items):');
    items.forEach((item, idx) => {
        console.log(`${idx + 1}. ID: ${item._id}`);
        console.log(`   carId: ${item.carId || 'VACÍO'}`);
        console.log(`   carName: ${item.carName || 'VACÍO'}`);
        console.log(`   Precio compra: $${item.purchasePrice}`);
        console.log(`   Precio sugerido: $${item.suggestedPrice}`);
        console.log(`   Cantidad: ${item.quantity}`);
        console.log('');
    });

    await mongoose.disconnect();
}

check().catch(e => console.error(e));
