/**
 * Migration Script: Add payment fields to existing deliveries
 * 
 * This script updates all existing deliveries in the database to include
 * the new payment tracking fields with default values.
 * 
 * Run once with: npx ts-node src/scripts/migrateDeliveryPayments.ts
 */

import mongoose from 'mongoose';
import { DeliveryModel } from '../models/Delivery';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels-manager';

async function migrateDeliveries() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Finding deliveries without payment fields...');
    
    // Find deliveries that don't have the payment fields
    const deliveries = await DeliveryModel.find({
      $or: [
        { paidAmount: { $exists: false } },
        { paymentStatus: { $exists: false } },
        { payments: { $exists: false } }
      ]
    });

    console.log(`📦 Found ${deliveries.length} deliveries to update`);

    if (deliveries.length === 0) {
      console.log('✅ All deliveries are already up to date!');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      try {
        // Update the delivery with default payment values
        delivery.paidAmount = delivery.paidAmount || 0;
        delivery.paymentStatus = delivery.paymentStatus || 'pending';
        delivery.payments = delivery.payments || [];
        
        await delivery.save();
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`  ⏳ Updated ${updated}/${deliveries.length} deliveries...`);
        }
      } catch (error) {
        failed++;
        console.error(`  ❌ Failed to update delivery ${delivery._id}:`, error);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successfully updated: ${updated} deliveries`);
    console.log(`  ❌ Failed: ${failed} deliveries`);
    console.log(`  📦 Total processed: ${deliveries.length} deliveries`);
    
    if (failed === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
console.log('🚀 Starting Delivery Payment Fields Migration...\n');
migrateDeliveries();
