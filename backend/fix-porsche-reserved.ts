
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { InventoryItemModel } from './src/models/InventoryItem';

dotenv.config();

async function fixPorsche() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    const items = await InventoryItemModel.find({ 
      reservedQuantity: { $gt: 0 }
    });

    console.log(`Found ${items.length} items with reserved > 0:`);
    for (const item of items) {
      console.log(`ID: ${item._id}, Name: ${item.carName}, ID: ${item.carId}, Brand: ${item.brand}, Qty: ${item.quantity}, Reserved: ${item.reservedQuantity}`);
      
      // We already fixed some in the previous run, let's see what's left
      console.log(`Fixing item ${item._id} (Reserved: ${item.reservedQuantity})...`);
      item.reservedQuantity = 0;
      await item.save();
      console.log('Fixed!');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixPorsche();
