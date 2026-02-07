/**
 * Migration Script: Add snapshot data to existing sales
 *
 * This script updates all existing sales to include photos, primaryPhotoIndex,
 * and costPrice from the current inventory items. This ensures that sales have
 * a historical snapshot of the items they sold.
 *
 * Usage:
 *   npx ts-node backend/scripts/migrateSalesSnapshot.ts
 *   or
 *   cd backend && npx ts-node scripts/migrateSalesSnapshot.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { SaleModel } from '../models/Sale';
import { InventoryItemModel } from '../models/InventoryItem';

interface MigrationStats {
  totalSales: number;
  salesWithoutPhotos: number;
  salesUpdated: number;
  itemsUpdated: number;
  itemsNotFoundInInventory: number;
  errors: number;
}

async function migrateSales() {
  const stats: MigrationStats = {
    totalSales: 0,
    salesWithoutPhotos: 0,
    salesUpdated: 0,
    itemsUpdated: 0,
    itemsNotFoundInInventory: 0,
    errors: 0
  };

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all sales
    const sales = await SaleModel.find({});
    stats.totalSales = sales.length;
    console.log(`📊 Found ${stats.totalSales} total sales\n`);

    // Process each sale
    for (const sale of sales) {
      let saleModified = false;
      let hasItemsWithoutPhotos = false;

      for (let i = 0; i < sale.items.length; i++) {
        const item = sale.items[i];

        // Check if item needs migration (no photos or no costPrice)
        const needsPhotos = !item.photos || item.photos.length === 0;
        const needsCostPrice = !item.costPrice || item.costPrice === 0;
        const needsPrimaryPhotoIndex = item.primaryPhotoIndex === undefined || item.primaryPhotoIndex === null;

        if (needsPhotos || needsCostPrice || needsPrimaryPhotoIndex) {
          hasItemsWithoutPhotos = true;

          // Try to get data from inventory
          if (item.inventoryItemId) {
            try {
              const inventoryItem = await InventoryItemModel.findById(item.inventoryItemId);

              if (inventoryItem) {
                let itemUpdated = false;

                // Update photos if needed
                if (needsPhotos && inventoryItem.photos && inventoryItem.photos.length > 0) {
                  sale.items[i].photos = inventoryItem.photos;
                  itemUpdated = true;
                }

                // Update primaryPhotoIndex if needed
                if (needsPrimaryPhotoIndex) {
                  sale.items[i].primaryPhotoIndex = inventoryItem.primaryPhotoIndex || 0;
                  itemUpdated = true;
                }

                // Update costPrice if needed
                if (needsCostPrice && inventoryItem.purchasePrice > 0) {
                  sale.items[i].costPrice = inventoryItem.purchasePrice;
                  // Recalculate profit
                  sale.items[i].profit = (item.unitPrice - inventoryItem.purchasePrice) * item.quantity;
                  itemUpdated = true;
                }

                if (itemUpdated) {
                  stats.itemsUpdated++;
                  saleModified = true;
                  console.log(`  ✓ Updated item: ${item.carId} - ${item.carName}`);
                }
              } else {
                stats.itemsNotFoundInInventory++;
                console.log(`  ⚠️  Inventory item not found for: ${item.carId} - ${item.carName} (ID: ${item.inventoryItemId})`);
              }
            } catch (error) {
              stats.errors++;
              console.error(`  ❌ Error processing item ${item.carId}:`, error);
            }
          } else {
            // Item doesn't have inventoryItemId (might be a catalog item or POS sale)
            console.log(`  ℹ️  Skipping item without inventoryItemId: ${item.carId} - ${item.carName}`);
          }
        }
      }

      // Save the sale if it was modified
      if (saleModified) {
        try {
          await sale.save();
          stats.salesUpdated++;
          console.log(`✅ Updated sale ${sale._id} (Customer: ${sale.customer?.name || 'N/A'})\n`);
        } catch (error) {
          stats.errors++;
          console.error(`❌ Error saving sale ${sale._id}:`, error);
        }
      }

      if (hasItemsWithoutPhotos && !saleModified) {
        stats.salesWithoutPhotos++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total sales processed:          ${stats.totalSales}`);
    console.log(`Sales updated:                  ${stats.salesUpdated}`);
    console.log(`Sales with items without data:  ${stats.salesWithoutPhotos}`);
    console.log(`Individual items updated:       ${stats.itemsUpdated}`);
    console.log(`Items not found in inventory:   ${stats.itemsNotFoundInInventory}`);
    console.log(`Errors encountered:             ${stats.errors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
console.log('🚀 Starting sales snapshot migration...\n');
migrateSales()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
