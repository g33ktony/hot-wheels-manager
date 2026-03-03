require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        const url = process.env.MONGODB_URI;
        await mongoose.connect(url);
        const db = mongoose.connection.db;

        const email = 'antonio@hotwheels.com';
        const newPassword = 'TestPassword123!';

        // Hash the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user
        const result = await db.collection('users').updateOne(
            { email: email },
            { $set: { password: hashedPassword } }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ Password reset for ${email}`);
            console.log(`New password: ${newPassword}`);
        } else {
            console.log(`❌ User not found: ${email}`);
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

resetPassword();
