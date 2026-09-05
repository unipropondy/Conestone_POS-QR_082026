const axios = require('axios');

async function testSalesSave() {
    console.log('Testing /api/sales/save with Yeahpay Paynow...');
    
    const dummySaleData = {
        settlementId: 'test-yeahpay-' + Date.now(),
        orderId: 'TEST-' + Date.now(),
        orderType: 'DINE-IN',
        tableNo: 'T1',
        items: [
            {
                dishId: 1,
                name: 'Test Item',
                qty: 1,
                price: 1.30,
                status: 'SERVED'
            }
        ],
        subTotal: 1.30,
        taxAmount: 0.00,
        serviceCharge: 0.00,
        takeawayCharge: 0.00,
        discountAmount: 0.00,
        totalAmount: 1.30,
        paymentMethod: 'Yeahpay Paynow',
        payments: [
            {
                payModeId: 7,
                payMode: 'Yeahpay Paynow',
                amount: 1.30,
                referenceNo: 'YP123456'
            }
        ]
    };

    try {
        const res = await axios.post('http://127.0.0.1:3000/api/sales/save', dummySaleData, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true
        });
        console.log('Response status:', res.status);
        console.log('Response data:', res.data);
    } catch (err) {
        console.error('Error:', err.message, err.code);
    }
}

testSalesSave();
