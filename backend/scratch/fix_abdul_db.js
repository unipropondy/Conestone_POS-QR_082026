const { poolPromise, sql } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('Fixing Abdul $8.73 credit payment in UCSPONDY DB...');

    // 1. Update start_date on CustomerCreditTransactions
    await pool.request().query(`
      UPDATE CustomerCreditTransactions
      SET start_date = '2026-09-11'
      WHERE TransactionId = '23C785FC-2DB9-4BC2-9A93-CAF09134339F'
    `);
    console.log('1. Updated start_date on CustomerCreditTransactions row.');

    // 2. Insert missing CashInEntry row
    const checkCi = await pool.request().query(`SELECT * FROM CashInEntry WHERE ReferenceNo = '24F43A47-0CBD-4DAE-AC44-E7450D23BDB3' AND Amount = 8.73`);
    if (checkCi.recordset.length === 0) {
      await pool.request().query(`
        INSERT INTO CashInEntry (CashInNo, CashInDate, Amount, Reason, Remarks, PaymentMode, ReferenceNo, TerminalCode, CreatedBy, CreatedOn, start_date)
        VALUES ('CI-20260911-8730', '2026-09-11', 8.73, 'Ledger Payment', 'Auto Cash In from MEMBER: 24F43A47-0CBD-4DAE-AC44-E7450D23BDB3', 'Cash', '24F43A47-0CBD-4DAE-AC44-E7450D23BDB3', '', 'Admin', '2026-09-11T19:28:25', '2026-09-11')
      `);
      console.log('2. Inserted missing CashInEntry row.');
    }

    // 3. Insert missing PaymentTransactionDetails row
    const checkPtd = await pool.request().query(`SELECT * FROM PaymentTransactionDetails WHERE ReferenceId = '24F43A47-0CBD-4DAE-AC44-E7450D23BDB3' AND Amount = 8.73`);
    if (checkPtd.recordset.length === 0) {
      await pool.request().query(`
        INSERT INTO PaymentTransactionDetails (PaymentTransactionId, ReferenceType, ReferenceId, PayModeId, Amount, ReferenceNo, CreatedDate, CreatedBy)
        VALUES (NEWID(), 'MEMBER', '24F43A47-0CBD-4DAE-AC44-E7450D23BDB3', 1, 8.73, '67c4ff94-d188-4544-9b8b-4bd8fc6888d9', '2026-09-11T19:28:25', '8C026364-77E7-4002-803B-9BBE187C60BD')
      `);
      console.log('3. Inserted missing PaymentTransactionDetails row.');
    }

    console.log('✅ Successfully backfilled DB for Abdul $8.73 payment!');
    process.exit(0);
  } catch (e) {
    console.error('Error fixing DB:', e);
    process.exit(1);
  }
})();
