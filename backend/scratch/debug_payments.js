const { poolPromise } = require('../config/db');

async function debugPayments() {
  try {
    const pool = await poolPromise;
    const sid = '73DCE934-9628-430B-A5A9-5C0463A74337';

    const ptd = await pool.request().input('Id', sid).query(`
      SELECT 
        ptd.PaymentTransactionId,
        ptd.ReferenceType,
        ptd.ReferenceId,
        ptd.PayModeId,
        ptd.Amount,
        ptd.ReferenceNo,
        COALESCE(pm.Description, pm.PayMode) AS PayModeName
      FROM PaymentTransactionDetails ptd
      LEFT JOIN Paymode pm ON pm.Position = ptd.PayModeId
      WHERE ptd.ReferenceId = @Id AND ptd.ReferenceType = 'BILL'
    `);
    console.log('PTD ROWS:', ptd.recordset);

    const pdc = await pool.request().input('Id', sid).query(`
      SELECT 
        pd.RestaurantBillId AS ReferenceId,
        pd.Amount,
        COALESCE(pm.Description, pm.PayMode) AS PayModeName
      FROM PaymentDetailCur pd
      LEFT JOIN Paymode pm ON pd.Paymode = pm.Position
      WHERE pd.RestaurantBillId = @Id
    `);
    console.log('PDC ROWS:', pdc.recordset);

    const sts = await pool.request().input('Id', sid).query(`
      SELECT 
        sh.SettlementID AS ReferenceId,
        sh.SysAmount AS Amount,
        sts.PayMode
      FROM SettlementHeader sh
      LEFT JOIN SettlementTotalSales sts ON sh.SettlementID = sts.SettlementID
      WHERE sh.SettlementID = @Id
    `);
    console.log('STS ROWS:', sts.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugPayments();
