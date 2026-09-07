const { poolPromise } = require('../config/db');

async function debugJoinDuplication() {
  try {
    const pool = await poolPromise;
    const res = await pool.request().query(`
      SELECT 
        sh.SettlementID, sh.BillNo, sh.SysAmount AS HeaderAmount,
        sts.PayMode, sts.SysAmount AS STSAmount
      FROM SettlementHeader sh
      LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
      WHERE sh.BillNo IN ('20260907-0005', '20260907-0007')
    `);
    console.log('JOINED ROWS:', res.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugJoinDuplication();
