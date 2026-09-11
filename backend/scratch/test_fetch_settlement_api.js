require('dotenv').config();
const axios = require('axios');

(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching settlement payment API for date:', today);
    const payRes = await axios.get(`http://127.0.0.1:3000/api/settlement/payment/T1/1?fromDate=${today}&toDate=${today}`);
    console.log('=== PAYMENTS API RESPONSE ===');
    console.log(payRes.data);

    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign({ id: '00000000-0000-0000-0000-000000000000', userName: 'Admin', role: 'ADMIN' }, secret);

    console.log('Fetching settlement cash-in API for date:', today);
    const ciRes = await axios.get(`http://127.0.0.1:3000/api/settlement/cash-in/T1?fromDate=${today}&toDate=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('=== CASH IN API RESPONSE ===');
    console.log(ciRes.data);

    process.exit(0);
  } catch(e) {
    console.error('Error calling settlement API:', e.message, e.response?.data);
    process.exit(1);
  }
})();
