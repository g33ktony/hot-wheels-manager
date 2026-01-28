const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

async function testSalesAPI() {
    try {
        console.log('🔗 Fetching sales from API...\n');

        const response = await axios.get(`${API_URL}/api/sales`);
        const sales = response.data.data;

        console.log(`📊 Total sales from API: ${sales.length}`);

        // Find sales with customerId
        const salesWithCustId = sales.filter(s => s.customerId);
        console.log(`📊 Sales with customerId: ${salesWithCustId.length}`);

        // Check the specific customer
        const jesusPavonSales = sales.filter(s => {
            // Try different ways of checking
            const custId = s.customerId?.toString?.() || s.customerId?._id?.toString?.() || s.customerId;
            return custId === '696ae633306de91ee686a76f7' || custId?.includes('696ae633');
        });

        console.log(`\n👤 Sales for Jesus pavon: ${jesusPavonSales.length}`);
        jesusPavonSales.forEach((s, i) => {
            console.log(`\n  Sale ${i + 1}:`);
            console.log(`    _id: ${s._id}`);
            console.log(`    customerId: ${s.customerId}`);
            console.log(`    customerId type: ${typeof s.customerId}`);
            if (typeof s.customerId === 'object') {
                console.log(`    customerId._id: ${s.customerId._id}`);
            }
            console.log(`    totalAmount: $${s.totalAmount}`);
            console.log(`    status: ${s.status}`);
        });

        // Show first 3 sales for debugging
        console.log(`\n📋 Sample sales (first 3):`);
        sales.slice(0, 3).forEach((s, i) => {
            console.log(`\n  Sale ${i + 1}:`);
            console.log(`    customerId: ${s.customerId}`);
            console.log(`    customerId type: ${typeof s.customerId}`);
            console.log(`    totalAmount: $${s.totalAmount}`);
        });

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Cannot connect to backend. Make sure it is running on port 3001');
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(1);
    }
}

testSalesAPI();
