const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('=== PaymentTransactionDetails (Today) ===');
    const ptd = await pool.request().query("SELECT * FROM PaymentTransactionDetails WHERE CAST(CreatedDate AS DATE) = '2026-09-11'");
    console.table(ptd.recordset);

    console.log('=== CustomerCreditTransactions ===');
    const cct = await pool.request().query("SELECT TransactionId, MemberId, TransactionType, BillAmount, PaidAmount, OutstandingAmount, PaymentMethod, Status, Remarks, CreatedDate, start_date FROM CustomerCreditTransactions");
    console.table(cct.recordset);

    console.log('=== CashInEntry ===');
    const ci = await pool.request().query("SELECT CashInId, CashInNo, Amount, Reason, Remarks, PaymentMode, ReferenceNo, CashInType = CASE WHEN Reason = 'Ledger Payment' OR Reason = 'Credit Settlement' THEN 'LEDGER' ELSE 'MANUAL' END, CreatedOn, start_date FROM CashInEntry");
    console.table(ci.recordset);

    console.log('=== Paymode Table ===');
    const pm = await pool.request().query("SELECT Position, PayMode, YeahPayEnabled FROM Paymode");
    console.table(pm.recordset);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
