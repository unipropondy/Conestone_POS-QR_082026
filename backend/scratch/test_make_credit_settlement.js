const { poolPromise, sql } = require('../config/db');
const { processSplitPayments } = require('../services/payment.service');

(async () => {
  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Find a credit customer or dummy customerId
    const custRes = await pool.request().query("SELECT TOP 1 CustomerId FROM CreditCustomerMaster");
    const customerId = custRes.recordset[0]?.CustomerId;
    console.log('Testing with CustomerId:', customerId);

    if (!customerId) {
      console.log('No credit customer found in DB.');
      await transaction.rollback();
      process.exit(1);
    }

    // 1. Process Cash credit settlement of $15.00
    console.log('--- Processing Cash Credit Settlement ($15.00) ---');
    await processSplitPayments({
      referenceType: 'MEMBER',
      referenceId: customerId,
      payments: [{ payModeId: 1, payMode: 'CASH', amount: 15.00 }],
      transaction,
      cashierId: null
    });

    // 2. Process PAYNOW credit settlement of $25.00 (Paymode Position 3 = PAYNOW)
    console.log('--- Processing PAYNOW Credit Settlement ($25.00) ---');
    await processSplitPayments({
      referenceType: 'MEMBER',
      referenceId: customerId,
      payments: [{ payModeId: 3, payMode: 'PAYNOW', amount: 25.00 }],
      transaction,
      cashierId: null
    });

    await transaction.commit();
    console.log('✅ Test settlements committed successfully!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error during test credit settlement:', e);
    process.exit(1);
  }
})();
