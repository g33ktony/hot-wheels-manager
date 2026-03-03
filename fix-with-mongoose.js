require('dotenv').config();
const mongoose = require('mongoose');

// Define the schema exactly as the backend does
const deliverySchema = new mongoose.Schema({
    scheduledDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    completedDate: { type: Date },
    customer: { type: mongoose.Schema.Types.Mixed },
    status: String,
    // ... other fields
}, { timestamps: true });

const DeliveryModel = mongoose.model('Delivery', deliverySchema, 'deliveries');

async function fixWithMongoose() {
    try {
        const url = process.env.MONGODB_URI;
        if (!url) {
            console.error('❌ MONGODB_URI not found');
            return;
        }

        await mongoose.connect(url);
        console.log('🔧 FIX: Using Mongoose to convert Extended JSON dates\n');

        // Find all deliveries
        const allDels = await DeliveryModel.find({});
        console.log(`Found ${allDels.length} deliveries\n`);

        let fixedCount = 0;

        for (const delivery of allDels) {
            let needsFix = false;

            // Check for Extended JSON objects
            if ((delivery.scheduledDate && typeof delivery.scheduledDate === 'object' && delivery.scheduledDate.$date) ||
                (delivery.createdAt && typeof delivery.createdAt === 'object' && delivery.createdAt.$date) ||
                (delivery.updatedAt && typeof delivery.updatedAt === 'object' && delivery.updatedAt.$date) ||
                (delivery.completedDate && typeof delivery.completedDate === 'object' && delivery.completedDate.$date)) {
                needsFix = true;
            }

            if (delivery.customer && typeof delivery.customer === 'object') {
                if ((delivery.customer.createdAt && typeof delivery.customer.createdAt === 'object' && delivery.customer.createdAt.$date) ||
                    (delivery.customer.updatedAt && typeof delivery.customer.updatedAt === 'object' && delivery.customer.updatedAt.$date)) {
                    needsFix = true;
                }
            }

            if (needsFix) {
                console.log(`Fixing delivery ${delivery._id}...`);

                // Fix top-level dates
                ['scheduledDate', 'createdAt', 'updatedAt', 'completedDate'].forEach(field => {
                    const val = delivery[field];
                    if (val && typeof val === 'object' && val.$date) {
                        delivery[field] = new Date(val.$date);
                        console.log(`  - Fixed ${field}`);
                    }
                });

                // Fix customer subdocument dates
                if (delivery.customer && typeof delivery.customer === 'object') {
                    ['createdAt', 'updatedAt'].forEach(field => {
                        const val = delivery.customer[field];
                        if (val && typeof val === 'object' && val.$date) {
                            delivery.customer[field] = new Date(val.$date);
                            console.log(`  - Fixed customer.${field}`);
                        }
                    });
                }

                // Save using Mongoose
                await delivery.save();
                fixedCount++;
                console.log(`✅ Saved delivery ${delivery._id}\n`);
            }
        }

        console.log(`✅ COMPLETED: Fixed ${fixedCount} deliveries with Mongoose`);

    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.errors) {
            console.error('Validation errors:', e.errors);
        }
    } finally {
        await mongoose.disconnect();
    }
}

fixWithMongoose();
