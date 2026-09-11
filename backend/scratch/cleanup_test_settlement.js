const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('Cleaning up test settlement entries...');
    await pool.request().query("DELETE FROM CashInEntry WHERE Remarks LIKE 'Auto Cash In from MEMBER:%'");
    await pool.request().query("DELETE FROM PaymentTransactionDetails WHERE ReferenceType = 'MEMBER'");
    console.log('✅ Cleaned test entries successfully');
    process.exit(0);
  } catch (e) {
    console.error('Error cleaning up test entries:', e);
    process.exit(1);
  }
})();
