const axios = require('axios');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || '00f2268f200bacc35cd361ad68f21ea7974770080d747fab0041ff11bfd4de8c';

async function testFetchPaymodes() {
    try {
        const testToken = jwt.sign({ userId: 1, role: 'ADMIN' }, JWT_SECRET);
        const res = await axios.get('http://127.0.0.1:3000/api/sales/payment-methods', {
            headers: { Authorization: `Bearer ${testToken}` }
        });
        console.log('Returned Paymodes:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFetchPaymodes();
