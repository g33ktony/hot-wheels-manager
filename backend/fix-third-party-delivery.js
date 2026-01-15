#!/usr/bin/env node

/**
 * Script para migrar entregas existentes
 * Agrega campos de tercero a todos los documentos de Delivery
 * 
 * Uso: node fix-third-party-delivery.js "mongodb://connection-string"
 */

const mongoose = require('mongoose')

async function fixDeliveries() {
    try {
        let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheels'

        // Si se pasa argumento, usar ese como URI
        if (process.argv[2]) {
            mongoUri = process.argv[2]
            console.log(`Using provided connection string\n`)
        }

        console.log('Connecting to MongoDB...')
        console.log(`Connection string: ${mongoUri.replace(/:[^:@]*@/, ':****@')}\n`)

        await mongoose.connect(mongoUri)
        console.log('Connected to MongoDB successfully\n')

        // Get the deliveries collection directly
        const db = mongoose.connection.db
        const collection = db.collection('deliveries')

        console.log('Searching for deliveries without third-party fields...')

        // Find all deliveries that don't have the third-party fields
        const deliveriesToFix = await collection.find({
            $or: [
                { isThirdPartyDelivery: { $exists: false } },
                { thirdPartyRecipient: { $exists: false } },
                { thirdPartyPhone: { $exists: false } }
            ]
        }).toArray()

        console.log(`Found ${deliveriesToFix.length} deliveries to update\n`)

        if (deliveriesToFix.length === 0) {
            console.log('All deliveries already have third-party fields. Exiting...')
            await mongoose.connection.close()
            return
        }

        // Ask for confirmation
        if (process.stdin.isTTY) {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            })

            const answer = await new Promise(resolve => {
                readline.question(`Do you want to update all ${deliveriesToFix.length} deliveries? (yes/no): `, resolve)
            })
            readline.close()

            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log('Operation cancelled.')
                await mongoose.connection.close()
                return
            }
        }

        // Update all deliveries
        console.log('Updating deliveries with third-party fields...')

        const result = await collection.updateMany(
            {
                $or: [
                    { isThirdPartyDelivery: { $exists: false } },
                    { thirdPartyRecipient: { $exists: false } },
                    { thirdPartyPhone: { $exists: false } }
                ]
            },
            {
                $set: {
                    isThirdPartyDelivery: false,
                    thirdPartyRecipient: null,
                    thirdPartyPhone: null
                }
            }
        )

        console.log(`\n✅ Successfully updated ${result.modifiedCount} deliveries`)
        console.log('\nDefault values set:')
        console.log('  - isThirdPartyDelivery: false')
        console.log('  - thirdPartyRecipient: null')
        console.log('  - thirdPartyPhone: null')

        // Verify the update
        console.log('\nVerifying update...')
        const stillMissing = await collection.countDocuments({
            $or: [
                { isThirdPartyDelivery: { $exists: false } },
                { thirdPartyRecipient: { $exists: false } },
                { thirdPartyPhone: { $exists: false } }
            ]
        })

        if (stillMissing === 0) {
            console.log('✅ All deliveries have been successfully updated!')
        } else {
            console.log(`⚠️  Warning: ${stillMissing} deliveries still missing fields`)
        }

        // Close connection
        await mongoose.connection.close()
        console.log('\nDatabase connection closed.')

    } catch (error) {
        console.error('Error fixing deliveries:', error)
        process.exit(1)
    }
}

// Run the script
fixDeliveries()
