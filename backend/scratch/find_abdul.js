const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('=== Searching for 8.73 in all tables ===');

    // 1. CustomerCreditMaster
    const cust = await pool.request().query("SELECT * FROM CreditCustomerMaster");
    console.log('CustomerCreditMaster:', cust.recordset);

    // 2. CustomerCreditTransactions for 8.73
    const cct = await pool.request().query("SELECT * FROM CustomerCreditTransactions WHERE BillAmount = 8.73 OR PaidAmount = 8.73 OR OutstandingAmount = 8.73 OR Remarks LIKE '%Abdul%' OR BillNo LIKE '%20260727-0005%'");
    console.log('CustomerCreditTransactions:', cct.recordset);

    // 3. RestaurantInvoiceCur or SettlementHeader for Order #20260727-0005
    const sh = await pool.request().query("SELECT SettlementID, OrderNo, SysAmount, CreatedDate, start_date FROM SettlementHeader WHERE OrderNo LIKE '%20260727-0005%' OR SettlementID IN (SELECT SettlementId FROM CustomerCreditTransactions WHERE BillAmount = 8.73)");
    console.log('SettlementHeader:', sh.recordset);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
