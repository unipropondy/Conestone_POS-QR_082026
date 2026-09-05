const { poolPromise } = require('../config/db');
const YeahPayService = require('../services/yeahpay.service');
const axios = require('axios');

async function testYeahPaySetup() {
    console.log('====================================================');
    console.log('🧪 YEAHPAY INTEGRATION & CONFIGURATION TEST');
    console.log('====================================================\n');

    // 1. Check Database Configuration
    console.log('1️⃣ Checking Database Paymodes...');
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Position, PayMode, Description, YeahPayEnabled, DeviceSN, DeviceSalt, Active
            FROM Paymode
            WHERE PayMode LIKE '%YEAHPAY%' OR YeahPayEnabled = 1
        `);

        if (result.recordset.length === 0) {
            console.log('⚠️ WARNING: No Paymodes found with YeahPayEnabled = 1 or name containing "YEAHPAY".');
        } else {
            console.log(`✅ Found ${result.recordset.length} YeahPay paymode(s) in DB:`);
            console.table(result.recordset.map(r => ({
                Position: r.Position,
                Name: r.PayMode,
                Enabled: r.YeahPayEnabled,
                DeviceSN: r.DeviceSN || '(Not Set)',
                DeviceSalt: r.DeviceSalt ? '••••••••' : '(Not Set)',
                Active: r.Active
            })));
        }
    } catch (err) {
        console.error('❌ DB Query Failed:', err.message);
    }

    // 2. Test Encryption & Service Instantiation
    console.log('\n2️⃣ Testing YeahPayService Encryption & Key Setup...');
    try {
        const yeahpay = new YeahPayService();
        if (yeahpay.serverPublicKeyPem && yeahpay.clientPrivateKeyPem) {
            console.log('✅ YeahPay RSA Public Key & Client Private Key loaded properly.');
            console.log('✅ Target Sync API Endpoint:', yeahpay.syncUrl);
        } else {
            console.log('❌ Keys missing in YeahPayService.');
        }
    } catch (err) {
        console.error('❌ Service Initialization Failed:', err.message);
    }

    // 3. Test YeahPay Server Connectivity (Sync Endpoint)
    console.log('\n3️⃣ Testing Connectivity to YeahPay Gateway Server...');
    try {
        const startTime = Date.now();
        // Send a ping/dummy test request to check endpoint response
        const res = await axios.post('https://business.yeahpay.sg/acceptance/acceptance-mis-pos/sync', {}, {
            headers: { 'Content-Type': 'application/json', 'appId': 'bin38m42efz4ta6f' },
            timeout: 10000,
            validateStatus: () => true
        });
        const elapsed = Date.now() - startTime;
        console.log(`✅ YeahPay Gateway Server REACHABLE! (HTTP ${res.status}, Response in ${elapsed}ms)`);
    } catch (err) {
        console.error('❌ Connection to YeahPay Server Failed:', err.message);
    }

    console.log('\n====================================================');
    console.log('🏁 TEST COMPLETE');
    console.log('====================================================');
    process.exit(0);
}

testYeahPaySetup();
