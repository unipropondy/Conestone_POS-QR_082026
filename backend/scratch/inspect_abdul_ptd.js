const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('=== PaymentTransactionDetails for Abdul (24F43A47-0CBD-4DAE-AC44-E7450D23BDB3) ===');
    const ptd = await pool.request().query(`
      SELECT * FROM PaymentTransactionDetails WHERE ReferenceId = '24F43A47-0CBD-4DAE-AC44-E7450D23BDB3' OR Amount = 8.73
    `);
    console.table(ptd.recordset);

    console.log('=== CashInEntry for Abdul or 8.73 ===');
    const ci = await pool.request().query(`
      SELECT * FROM CashInEntry WHERE Amount = 8.73 OR ReferenceNo = '24F43A47-0CBD-4DAE-AC44-E7450D23BDB3' OR Remarks LIKE '%Abdul%'
    `);
    console.table(ci.recordset);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
