#!/usr/bin/env node

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const STORE_ID = '69a08b82d0f5f8acd705a4d9';  // Tienda de Coleccionables - Sistema
const TOKEN = process.env.TEST_TOKEN || 'test-token';

async function testDashboardMetrics() {
    console.log('🧪 Testing Dashboard Metrics Filtering');
    console.log('=====================================\n');

    try {
        // Test 1: Get metrics without storeId parameter (should use user's store)
        console.log('📊 Test 1: GET /dashboard/metrics (without storeId param)');
        let response = await fetch(`${BASE_URL}/api/dashboard/metrics`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        let data = await response.json();
        console.log('✓ Response status:', response.status);
        console.log('✓ Metrics keys:', Object.keys(data.data || {}).slice(0, 5).join(', ') + '...');
        console.log('✓ Total inventory items:', data.data?.totalInventoryItems);
        console.log('✓ Cached:', data.cached ? 'Yes' : 'No');
        console.log('');

        // Test 2: Get metrics with storeId parameter
        console.log('📊 Test 2: GET /dashboard/metrics?storeId=' + STORE_ID);
        response = await fetch(`${BASE_URL}/api/dashboard/metrics?storeId=${STORE_ID}`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        data = await response.json();
        console.log('✓ Response status:', response.status);
        console.log('✓ Metrics keys:', Object.keys(data.data || {}).slice(0, 5).join(', ') + '...');
        console.log('✓ Total inventory items:', data.data?.totalInventoryItems);
        console.log('✓ Total sales:', data.data?.totalSales);
        console.log('✓ Cached:', data.cached ? 'Yes' : 'No');
        console.log('');

        console.log('✅ All tests completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Helper function
async function fetch(url, options) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? require('https') : http;

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: options.headers
        };

        const req = client.request(requestOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        json: async () => JSON.parse(body)
                    });
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

testDashboardMetrics();
