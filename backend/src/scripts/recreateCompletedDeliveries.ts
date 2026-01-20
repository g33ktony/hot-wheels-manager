/**
 * Script: Recreate Completed Deliveries from Sales
 * 
 * Identifies all sales that were created from deliveries (have deliveryId)
 * and creates corresponding completed delivery records for historical tracking
 */

import mongoose from 'mongoose';
import { SaleModel } from '../models/Sale';
import { DeliveryModel } from '../models/Delivery';
import { CustomerModel } from '../models/Customer';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotweels');
    console.log('📦 Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const recreateDeliveries = async () => {
  try {
    // Find all sales created from deliveries
    const salesFromDeliveries = await SaleModel.find({ 
      deliveryId: { $exists: true, $ne: null } 
    }).populate('customerId');

    console.log(`\n🔍 Found ${salesFromDeliveries.length} sales created from deliveries\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const sale of salesFromDeliveries) {
      try {
        // Check if delivery already exists
        const existingDelivery = await DeliveryModel.findById(sale.deliveryId);
        
        if (existingDelivery) {
          console.log(`⏭️  Delivery ${sale.deliveryId} already exists, skipping...`);
          skipped++;
          continue;
        }

        // Create delivery from sale data
        const deliveryData = {
          _id: sale.deliveryId, // Use the same ID
          customerId: sale.customerId?._id,
          items: sale.items?.map((item: any) => ({
            inventoryItemId: item.inventoryItemId,
            carId: item.carId,
            carName: item.carName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            seriesId: item.seriesId,
            seriesName: item.seriesName,
            seriesSize: item.seriesSize,
            seriesPrice: item.seriesPrice,
            isSoldAsSeries: item.isSoldAsSeries
          })) || [],
          scheduledDate: sale.saleDate || new Date(),
          scheduledTime: '00:00', // Unknown time, using default
          location: (sale.customerId as any)?.address || 'Unknown',
          totalAmount: sale.totalAmount || 0,
          notes: `Recreated from sale ${sale._id}. Original sale date: ${sale.saleDate?.toISOString()}`,
          status: 'completed', // Mark as completed
          completedDate: sale.saleDate || new Date(),
          paidAmount: sale.totalAmount || 0,
          paymentStatus: 'paid', // Sales are always paid
          payments: [
            {
              amount: sale.totalAmount || 0,
              paymentDate: sale.saleDate || new Date(),
              paymentMethod: 'sale',
              notes: 'Automatic payment from sale'
            }
          ]
        };

        const newDelivery = new DeliveryModel(deliveryData);
        await newDelivery.save();

        console.log(`✅ Created delivery from sale ${sale._id}`);
        created++;
      } catch (err: any) {
        console.error(`❌ Error creating delivery from sale ${sale._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📈 Total: ${created + skipped}\n`);

    if (created > 0) {
      console.log(`🎉 Successfully recreated ${created} completed deliveries!\n`);
    } else {
      console.log(`ℹ️  No new deliveries were created.\n`);
    }
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
};

// Run the script
(async () => {
  await connectDB();
  await recreateDeliveries();
})();
