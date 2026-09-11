const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('=== Comparing SettlementHeader and RestaurantInvoiceCur per bill ===');
    const res = await pool.request().query(`
      SELECT 
        sh.SettlementID,
        sh.SubTotal as SH_SubTotal,
        sh.SysAmount as SH_SysAmount,
        ric.StatusCode as RIC_StatusCode,
        sh.start_date
      FROM SettlementHeader sh
      LEFT JOIN RestaurantInvoiceCur ric ON sh.SettlementID = ric.RestaurantBillId
      WHERE sh.start_date = '2026-09-11'
    `);
    console.table(res.recordset);

    console.log('=== Comparing PaymentDetailCur per bill ===');
    const pdc = await pool.request().query(`
      SELECT 
        RestaurantBillId,
        Remarks,
        Amount,
        start_date
      FROM PaymentDetailCur
      WHERE start_date = '2026-09-11'
    `);
    console.table(pdc.recordset);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
