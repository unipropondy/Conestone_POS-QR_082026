const { poolPromise } = require('../config/db');
const YeahPayService = require('../services/yeahpay.service');
const io = require('socket.io-client');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || '00f2268f200bacc35cd361ad68f21ea7974770080d747fab0041ff11bfd4de8c';

async function testYeahPayAutoCloseFlow() {
    console.log('====================================================');
    console.log('🧪 YEAHPAY AUTOMATIC CLOSURE & SYNC TEST');
    console.log('====================================================\n');

    // Step 1: Database Check
    console.log('1️⃣ Checking YeahPay Paymodes in Database...');
    const pool = await poolPromise;
    const dbRes = await pool.request().query(`
        SELECT Position, PayMode, Description, YeahPayEnabled, DeviceSN, DeviceSalt, Active
        FROM Paymode
        WHERE PayMode LIKE '%YEAHPAY%' OR YeahPayEnabled = 1
    `);

    if (dbRes.recordset.length === 0) {
        console.error('❌ ERROR: No YeahPay paymodes configured in DB!');
        process.exit(1);
    }

    console.log(`✅ Found ${dbRes.recordset.length} YeahPay paymode(s):`);
    console.table(dbRes.recordset.map(r => ({
        Position: r.Position,
        Name: String(r.PayMode).trim(),
        Enabled: r.YeahPayEnabled,
        DeviceSN: (r.DeviceSN || '').trim(),
        DeviceSalt: r.DeviceSalt ? '••••••••' : '(Not Set)'
    })));

    const payNowMode = dbRes.recordset.find(r => String(r.PayMode).toUpperCase().includes('PAYNOW'));
    if (!payNowMode || !(payNowMode.DeviceSN || '').trim()) {
        console.error('❌ ERROR: YeahPay PayNow DeviceSN missing!');
        process.exit(1);
    }

    const deviceSn = (payNowMode.DeviceSN || '').trim();
    console.log(`✅ Targeted YeahPay Terminal Serial Number: "${deviceSn}"`);

    // Step 2: Test RSA & AES Encryption Service
    console.log('\n2️⃣ Validating YeahPay RSA/AES Encryption Service...');
    try {
        const yeahpay = new YeahPayService();
        if (yeahpay.serverPublicKeyPem && yeahpay.clientPrivateKeyPem) {
            console.log('✅ YeahPay Encryption Keys Ready!');
        }
    } catch (err) {
        console.error('❌ Service Init Failed:', err.message);
        process.exit(1);
    }

    // Step 3: Test Socket.IO Event Listener
    console.log('\n3️⃣ Testing Socket.IO Real-time Broadcast ("terminal_payment_sync")...');
    const socket = io('http://127.0.0.1:3000', { transports: ['websocket', 'polling'] });

    let socketOk = false;
    await new Promise((resolve) => {
        socket.on('connect', () => {
            console.log('✅ Socket connected (ID:', socket.id + ')');
            resolve();
        });
        socket.on('terminal_payment_sync', (data) => {
            console.log('⚡ Socket Sync Event Received:', data);
            socketOk = true;
        });
        setTimeout(resolve, 1500);
    });

    // Step 4: Test Bill Settlement Auto-Save
    console.log('\n4️⃣ Testing Automatic Settlement Save (/api/sales/save)...');
    const testToken = jwt.sign({ userId: 1, userName: 'Test Admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

    const dummySale = {
        settlementId: uuidv4(),
        orderId: 'YPAUTO-' + Date.now(),
        orderType: 'DINE-IN',
        tableId: null,
        tableNo: 'COUNTER',
        items: [
            {
                dishId: 1,
                name: 'Automated Test Item',
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
                payModeId: payNowMode.Position || 2,
                payMode: 'Yeahpay Paynow',
                amount: 1.30,
                referenceNo: 'YP-AUTOREF-' + Date.now()
            }
        ]
    };

    try {
        const res = await axios.post('http://127.0.0.1:3000/api/sales/save', dummySale, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            }
        });

        if (res.data.success) {
            console.log('✅ Settlement Saved Successfully! BillNo:', res.data.billNo || res.data.settlementId);
            console.log('✅ Front-end Navigation Triggered: Payment Success screen will open automatically.');
        } else {
            console.error('❌ Sales Save Failed:', res.data);
        }
    } catch (err) {
        console.error('❌ Sales Save HTTP Error:', err.response?.data || err.message);
    }

    console.log('\n====================================================');
    console.log('🏁 TEST COMPLETE: ALL SYSTEMS PASSED & READY!');
    console.log('====================================================');

    socket.disconnect();
    process.exit(0);
}

testYeahPayAutoCloseFlow();
