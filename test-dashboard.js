const http = require('http');

function testDashboard() {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/dashboard/metrics',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Response:', data);
            try {
                const parsed = JSON.parse(data);
                console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log('Not valid JSON');
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Request error: ${e.message}`);
    });

    req.end();
}

// Test in 2 seconds to give server time to start
setTimeout(testDashboard, 2000);