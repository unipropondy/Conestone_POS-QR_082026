const { poolPromise } = require('../config/db');

async function testQuery() {
  try {
    const pool = await poolPromise;
    const res = await pool.request().query(`
      SELECT TOP 5 
        sh.SettlementID, sh.BillNo, sh.SysAmount, sh.start_date, sh.LastSettlementDate,
        sts.PayMode, pdc.Remarks AS PayDetailRemarks
      FROM SettlementHeader sh
      LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
      LEFT JOIN PaymentDetailCur pdc ON sh.SettlementID = pdc.RestaurantBillId
      ORDER BY sh.LastSettlementDate DESC
    `);
    console.log('=== LATEST DB SALES ===');
    console.log(JSON.stringify(res.recordset, null, 2));

    const salesReportRes = await pool.request().query(`
      SELECT 
        sh.BillNo,
        COALESCE(sh.start_date, CAST(sh.LastSettlementDate AS DATE)) AS BusinessDate,
        sh.SysAmount,
        sts.PayMode,
        pdc.Remarks AS PaymentMethod
      FROM SettlementHeader sh
      LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
      LEFT JOIN PaymentDetailCur pdc ON sh.SettlementID = pdc.RestaurantBillId
      WHERE CAST(COALESCE(sh.start_date, CAST(sh.LastSettlementDate AS DATE)) AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY sh.LastSettlementDate DESC
    `);
    console.log('\n=== TODAY SALES REPORT QUERY RESULT ===');
    console.log(JSON.stringify(salesReportRes.recordset, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('DB Query Error:', err);
    process.exit(1);
  }
}

testQuery();
