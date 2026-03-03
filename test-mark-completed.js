require('dotenv').config();
const axios = require('axios');

async function testMarkDeliveryAsCompleted() {
    try {
        // First, login to get auth token
        console.log('🔐 Logging in...\n');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'antonio@hotwheels.com',
            password: 'TestPassword123!'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!loginRes.data.success) {
            console.error('❌ Login failed:', loginRes.data.message);
            return;
        }

        const token = loginRes.data.data.token;
        console.log('✅ Logged in successfully');
        console.log(`Token: ${token.substring(0, 20)}...\n`);

        // Now try to mark delivery as completed
        const deliveryId = '697d55e08d120b933c9cebcf';
        console.log(`📦 Marking delivery ${deliveryId} as completed...\n`);

        const result = await axios.patch(
            `http://localhost:3001/api/deliveries/${deliveryId}/completed`,
            { paymentStatus: 'paid' },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (result.data.success) {
            console.log('✅ SUCCESS! Delivery marked as completed');
            console.log(`Response:`, JSON.stringify(result.data, null, 2).substring(0, 500));
        } else {
            console.log('❌ FAILED:', result.data.message);
        }

    } catch (e) {
        console.error('❌ Error:', e.response?.data?.message || e.message);
        if (e.response?.data?.errors) {
            console.error('Validation errors:', e.response.data.errors);
        }
    }
}

testMarkDeliveryAsCompleted();
