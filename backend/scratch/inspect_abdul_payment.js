const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('=== All CustomerCreditTransactions for Abdul or $8.73 ===');
    const cct = await pool.request().query(`
      SELECT *
      FROM CustomerCreditTransactions
      WHERE PaidAmount = 8.73 OR BillAmount = 8.73 OR OutstandingAmount = 8.73 OR TransactionType = 'PAYMENT'
      ORDER BY CreatedDate DESC
    `);
    console.table(cct.recordset);

    console.log('=== CustomerCreditAllocations ===');
    try {
      const cca = await pool.request().query(`SELECT TOP 10 * FROM CustomerCreditAllocations ORDER BY CreatedDate DESC`);
      console.table(cca.recordset);
    } catch(e) { console.log('No CustomerCreditAllocations or error:', e.message); }

    console.log('=== PaymentDetailCur ===');
    const pdc = await pool.request().query(`
      SELECT * FROM PaymentDetailCur WHERE Amount = 8.73 OR Remarks LIKE '%Abdul%' OR Remarks LIKE '%Credit%' OR Remarks LIKE '%Member%'
    `);
    console.table(pdc.recordset);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
