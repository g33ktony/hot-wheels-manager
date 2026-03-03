require('dotenv').config();
const mongoose = require('mongoose');

async function fixWithAggregation() {
    try {
        const url = process.env.MONGODB_URI;
        if (!url) {
            console.error('❌ MONGODB_URI not found');
            return;
        }

        await mongoose.connect(url);
        console.log('🔧 FIX: Using aggregation pipeline to fix Extended JSON dates\n');

        const db = mongoose.connection.db;
        const deliveries = db.collection('deliveries');

        // Use aggregation pipeline to convert Extended JSON dates
        const result = await deliveries.updateMany(
            {
                $or: [
                    { scheduledDate: { $type: 'object' } },
                    { createdAt: { $type: 'object' } },
                    { updatedAt: { $type: 'object' } },
                    { completedDate: { $type: 'object' } },
                    { 'customer.createdAt': { $type: 'object' } },
                    { 'customer.updatedAt': { $type: 'object' } }
                ]
            },
            [
                {
                    $set: {
                        scheduledDate: {
                            $cond: [
                                { $eq: [{ $type: '$scheduledDate' }, 'object'] },
                                { $toDate: '$scheduledDate.$date' },
                                '$scheduledDate'
                            ]
                        },
                        createdAt: {
                            $cond: [
                                { $eq: [{ $type: '$createdAt' }, 'object'] },
                                { $toDate: '$createdAt.$date' },
                                '$createdAt'
                            ]
                        },
                        updatedAt: {
                            $cond: [
                                { $eq: [{ $type: '$updatedAt' }, 'object'] },
                                { $toDate: '$updatedAt.$date' },
                                '$updatedAt'
                            ]
                        },
                        completedDate: {
                            $cond: [
                                { $eq: [{ $type: '$completedDate' }, 'object'] },
                                { $toDate: '$completedDate.$date' },
                                '$completedDate'
                            ]
                        },
                        customer: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$customer', null] },
                                        { $eq: [{ $type: '$customer' }, 'object'] }
                                    ]
                                },
                                {
                                    $mergeObjects: [
                                        '$customer',
                                        {
                                            createdAt: {
                                                $cond: [
                                                    { $eq: [{ $type: '$customer.createdAt' }, 'object'] },
                                                    { $toDate: '$customer.createdAt.$date' },
                                                    '$customer.createdAt'
                                                ]
                                            },
                                            updatedAt: {
                                                $cond: [
                                                    { $eq: [{ $type: '$customer.updatedAt' }, 'object'] },
                                                    { $toDate: '$customer.updatedAt.$date' },
                                                    '$customer.updatedAt'
                                                ]
                                            }
                                        }
                                    ]
                                },
                                '$customer'
                            ]
                        }
                    }
                }
            ]
        );

        console.log(`✅ Updated ${result.modifiedCount} deliveries`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

fixWithAggregation();
