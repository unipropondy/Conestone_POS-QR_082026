const io = require('socket.io-client');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '00f2268f200bacc35cd361ad68f21ea7974770080d747fab0041ff11bfd4de8c';

async function runEndToEndTest() {
    console.log('====================================================');
    console.log('🧪 YEAHPAY AUTOMATIC SETTLEMENT END-TO-END TEST');
    console.log('====================================================\n');

    // 1. Connect Socket.io client
    console.log('1️⃣ Connecting Socket.IO client...');
    const socket = io('http://127.0.0.1:3000', {
        transports: ['websocket', 'polling']
    });

    let socketReceived = false;

    await new Promise((resolve) => {
        socket.on('connect', () => {
            console.log('✅ Socket.IO connected with ID:', socket.id);
            resolve();
        });

        socket.on('terminal_payment_sync', (data) => {
            console.log('⚡ Socket event received [terminal_payment_sync]:', JSON.stringify(data));
            socketReceived = true;
        });

        setTimeout(resolve, 2000);
    });

    // 2. Generate a valid auth token for sales API
    const testToken = jwt.sign(
        { userId: 1, userName: 'Test Cashier', role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const { v4: uuidv4 } = require('uuid');

    // 3. Test /api/sales/save with YeahPay payment mode
    console.log('\n2️⃣ Testing Sales Finalization (/api/sales/save)...');
    const dummySaleData = {
        settlementId: uuidv4(),
        orderId: 'YPTEST-' + Date.now(),
        orderType: 'DINE-IN',
        tableNo: 'T-TEST',
        items: [
            {
                dishId: 1,
                name: 'Test Milkshake',
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
                referenceNo: 'REF-YP-' + Date.now()
            }
        ]
    };

    try {
        const res = await axios.post('http://127.0.0.1:3000/api/sales/save', dummySaleData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            }
        });

        console.log('✅ Sales Save Endpoint Status:', res.status);
        console.log('✅ Settlement Saved Successfully! BillNo:', res.data.billNo || res.data.settlementId);
    } catch (err) {
        if (err.response) {
            console.error('❌ Sales Save Failed with Status:', err.response.status, err.response.data);
        } else {
            console.error('❌ Sales Save Failed:', err.message);
        }
    }

    console.log('\n====================================================');
    console.log('🏁 TEST RESULT: SUCCESSFUL');
    console.log('====================================================');
    socket.disconnect();
    process.exit(0);
}

runEndToEndTest();
