import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function addFantasyField() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const inventoryCollection = db.collection('inventoryitems');

    console.log('\n📊 Checking current state...');
    const totalItems = await inventoryCollection.countDocuments();
    const itemsWithoutFantasy = await inventoryCollection.countDocuments({ isFantasy: { $exists: false } });
    
    console.log(`Total items: ${totalItems}`);
    console.log(`Items without isFantasy field: ${itemsWithoutFantasy}`);

    if (itemsWithoutFantasy === 0) {
      console.log('\n✅ All items already have the isFantasy field');
      await mongoose.connection.close();
      return;
    }

    console.log('\n🔄 Adding isFantasy field to items...');
    
    const result = await inventoryCollection.updateMany(
      { isFantasy: { $exists: false } },
      { $set: { isFantasy: false } }
    );

    console.log(`\n✅ Migration completed!`);
    console.log(`   Modified documents: ${result.modifiedCount}`);
    console.log(`   Matched documents: ${result.matchedCount}`);

    // Verify
    const remainingWithoutFantasy = await inventoryCollection.countDocuments({ isFantasy: { $exists: false } });
    console.log(`\n✅ Verification: ${remainingWithoutFantasy} items still missing isFantasy (should be 0)`);

    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addFantasyField();
