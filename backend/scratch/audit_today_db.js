const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('====================================================');
    console.log('       UCSPONDY DATABASE AUDIT FOR TODAY (2026-09-11)');
    console.log('====================================================\n');

    // 1. SettlementHeader rows today
    console.log('--- 1. SettlementHeader Rows Today ---');
    const sh = await pool.request().query(`
      SELECT SettlementID, SubTotal, DiscountAmount, ServiceCharge, TotalTax, SysAmount, IsCancelled, start_date
      FROM SettlementHeader
      WHERE start_date = '2026-09-11'
    `);
    console.table(sh.recordset);

    // Sum of SettlementHeader
    const shSum = await pool.request().query(`
      SELECT 
        COUNT(*) as Count,
        SUM(SubTotal) as SubTotal,
        SUM(DiscountAmount) as DiscountAmount,
        SUM(ServiceCharge) as ServiceCharge,
        SUM(TotalTax) as TotalTax,
        SUM(SysAmount) as SysAmount
      FROM SettlementHeader
      WHERE (IsCancelled = 0 OR IsCancelled IS NULL)
        AND start_date = '2026-09-11'
    `);
    console.log('SettlementHeader SUM:', shSum.recordset[0]);

    // 2. RestaurantInvoiceCur rows today
    console.log('\n--- 2. RestaurantInvoiceCur Rows Today ---');
    const ric = await pool.request().query(`
      SELECT RestaurantBillId, InvoiceNo, GrossAmount, NetAmount, StatusCode, start_date, CreatedOn
      FROM RestaurantInvoiceCur
      WHERE start_date = '2026-09-11' OR CAST(CreatedOn AS DATE) = '2026-09-11'
    `);
    console.table(ric.recordset);

    // 3. PaymentDetailCur rows today
    console.log('\n--- 3. PaymentDetailCur Rows Today ---');
    const pdc = await pool.request().query(`
      SELECT PaymentId, RestaurantBillId, Paymode, Amount, Remarks, start_date, CreatedOn
      FROM PaymentDetailCur
      WHERE start_date = '2026-09-11' OR CAST(CreatedOn AS DATE) = '2026-09-11'
    `);
    console.table(pdc.recordset);

    // 4. PaymentDetailCur grouped by Remarks/Paymode
    const pdcGroup = await pool.request().query(`
      SELECT LTRIM(RTRIM(Remarks)) as Remarks, SUM(Amount) as TotalAmount, COUNT(*) as Count
      FROM PaymentDetailCur
      WHERE start_date = '2026-09-11' OR CAST(CreatedOn AS DATE) = '2026-09-11'
      GROUP BY LTRIM(RTRIM(Remarks))
    `);
    console.log('\n--- PaymentDetailCur Grouped by Paymode ---');
    console.table(pdcGroup.recordset);

    // 5. CustomerCreditTransactions rows today
    console.log('\n--- 5. CustomerCreditTransactions Today ---');
    const cct = await pool.request().query(`
      SELECT TransactionId, MemberId, SettlementId, BillNo, TransactionType, BillAmount, PaidAmount, OutstandingAmount, PaymentMethod, Status, Remarks, CreatedDate, start_date
      FROM CustomerCreditTransactions
      WHERE start_date = '2026-09-11' OR CAST(CreatedDate AS DATE) = '2026-09-11'
    `);
    console.table(cct.recordset);

    // 6. CashInEntry rows today
    console.log('\n--- 6. CashInEntry Today ---');
    const ci = await pool.request().query(`
      SELECT CashInId, CashInNo, Amount, Reason, Remarks, PaymentMode, ReferenceNo, CreatedOn, start_date
      FROM CashInEntry
      WHERE start_date = '2026-09-11' OR CAST(CashInDate AS DATE) = '2026-09-11'
    `);
    console.table(ci.recordset);

    // 7. PaymentTransactionDetails rows today
    console.log('\n--- 7. PaymentTransactionDetails Today ---');
    const ptd = await pool.request().query(`
      SELECT *
      FROM PaymentTransactionDetails
      WHERE CAST(CreatedDate AS DATE) = '2026-09-11'
    `);
    console.table(ptd.recordset);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
