const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const json = JSON.parse(fs.readFileSync('data/hotwheels_database.json', 'utf8'));
    console.log('=== JSON CATALOG ===');
    console.log('Items in JSON:', json.length);

    const collections = await db.listCollections().toArray();
    console.log('\n=== MONGODB COLLECTIONS ===');
    for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
        const count = await db.collection(col.name).countDocuments();
        console.log('  ' + col.name + ':', count);
    }

    const mongoCarCount = await db.collection('hotwheelscars').countDocuments();
    console.log('\n=== SYNC STATUS ===');
    console.log('JSON items:', json.length);
    console.log('MongoDB hotwheelscars:', mongoCarCount);
    console.log('Difference:', json.length - mongoCarCount);

    if (json.length === mongoCarCount) {
        console.log('STATUS: IN SYNC');
    } else {
        console.log('STATUS: OUT OF SYNC -- need to run sync-to-mongo');
    }

    // Spot-check: pick 5 random items and verify they exist
    const indices = [0, 100, 1000, 10000, json.length - 1];
    console.log('\n=== SPOT CHECK ===');
    for (const idx of indices) {
        const item = json[idx];
        if (!item) continue;
        const mongoItem = await db.collection('hotwheelscars').findOne({ toy_num: item.toy_num });
        const photoMatch = mongoItem && mongoItem.photo_url === item.photo_url;
        console.log('  ' + item.toy_num + ': ' + (mongoItem ? 'exists' : 'MISSING') + (mongoItem ? (photoMatch ? ' (photo synced)' : ' (photo STALE)') : ''));
    }

    // Estimate staleness from 300 random items
    let stale = 0, synced = 0, checked = 0;
    const staleFields = { photo_url: 0, photo_url_carded: 0, photo_gallery: 0, color: 0, tampo: 0 };
    const sampleIndices = Array.from({ length: 300 }, () => Math.floor(Math.random() * json.length));
    for (const idx of sampleIndices) {
        const item = json[idx];
        const mongoItem = await db.collection('hotwheelscars').findOne({ toy_num: item.toy_num });
        if (mongoItem === null) continue;
        checked++;
        let isStale = false;
        if (mongoItem.photo_url !== item.photo_url) { staleFields.photo_url++; isStale = true; }
        if (mongoItem.photo_url_carded !== item.photo_url_carded) { staleFields.photo_url_carded++; isStale = true; }
        const mGal = JSON.stringify(mongoItem.photo_gallery || []);
        const jGal = JSON.stringify(item.photo_gallery || []);
        if (mGal !== jGal) { staleFields.photo_gallery++; isStale = true; }
        if ((mongoItem.color || '') !== (item.color || '')) { staleFields.color++; isStale = true; }
        if ((mongoItem.tampo || '') !== (item.tampo || '')) { staleFields.tampo++; isStale = true; }
        if (isStale) stale++;
        else synced++;
    }
    console.log('\n=== STALENESS (sampled ' + checked + ' items) ===');
    console.log('Fully synced:', synced, '| Stale:', stale, '(' + Math.round(stale * 100 / checked) + '%)');
    console.log('Stale fields:', JSON.stringify(staleFields));

    await mongoose.disconnect();
})();
