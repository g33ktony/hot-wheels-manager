require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function fixWithModel() {
    try {
        const url = process.env.MONGODB_URI;
        if (!url) {
            console.error('❌ MONGODB_URI not found');
            return;
        }

        await mongoose.connect(url);
        console.log('🔧 Loading Delivery model and fixing Extended JSON dates\n');

        // Import the models after connecting
        const { DeliveryModel } = require('./backend/dist/models/Delivery');

        // Find all deliveries with findByIdAnd or have Extended JSON
        const allDels = await mongoose.connection.collection('deliveries').find({}).toArray();
        console.log(`Found ${allDels.length} deliveries\n`);

        let fixedCount = 0;
        let problems = [];

        for (const delDB of allDels) {
            let hasIssue = false;

            // Check for Extended JSON
            if ((delDB.scheduledDate && typeof delDB.scheduledDate === 'object' && delDB.scheduledDate.$date) ||
                (delDB.createdAt && typeof delDB.createdAt === 'object' && delDB.createdAt.$date) ||
                (delDB.updatedAt && typeof delDB.updatedAt === 'object' && delDB.updatedAt.$date) ||
                (delDB.completedDate && typeof delDB.completedDate === 'object' && delDB.completedDate.$date)) {
                hasIssue = true;
            }

            if (delDB.customer && typeof delDB.customer === 'object') {
                if ((delDB.customer.createdAt && typeof delDB.customer.createdAt === 'object' && delDB.customer.createdAt.$date) ||
                    (delDB.customer.updatedAt && typeof delDB.customer.updatedAt === 'object' && delDB.customer.updatedAt.$date)) {
                    hasIssue = true;
                }
            }

            if (hasIssue) {
                problems.push(delDB._id.toString());

                // Use raw updateOne to convert dates
                const updates = {};
                const replaceDateIfExtJSON = (val) => {
                    if (val && typeof val === 'object' && val.$date) {
                        return new Date(val.$date);
                    }
                    return val;
                };

                // Top-level dates
                ['scheduledDate', 'createdAt', 'updatedAt', 'completedDate'].forEach(field => {
                    if (delDB[field]) {
                        updates[field] = replaceDateIfExtJSON(delDB[field]);
                    }
                });

                // Customer subdocument
                if (delDB.customer && typeof delDB.customer === 'object') {
                    const newCustomer = { ...delDB.customer };
                    ['createdAt', 'updatedAt'].forEach(field => {
                        if (newCustomer[field]) {
                            newCustomer[field] = replaceDateIfExtJSON(newCustomer[field]);
                        }
                    });
                    updates.customer = newCustomer;
                }

                await mongoose.connection.collection('deliveries').updateOne(
                    { _id: delDB._id },
                    { $set: updates }
                );

                fixedCount++;
                console.log(`✅ Fixed ${delDB._id}`);
            }
        }

        console.log(`\n✅ COMPLETED: ${fixedCount} deliveries fixed`);
        if (problems.length > 0) {
            console.log(`\nProblematic delivery IDs:`);
            problems.forEach(id => console.log(`  - ${id}`));
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error(e.stack);
    } finally {
        await mongoose.disconnect();
    }
}

fixWithModel();
