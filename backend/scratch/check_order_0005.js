const { poolPromise } = require('../config/db');

async function checkOrder0005() {
  try {
    const pool = await poolPromise;
    const header = await pool.request().query(`
      SELECT SettlementID, BillNo, SysAmount, SubTotal, TotalTax, ServiceCharge, TakeawayCharge, DiscountAmount 
      FROM SettlementHeader 
      WHERE BillNo = '20260907-0005'
    `);
    console.log('=== SETTLEMENT HEADER ===', header.recordset);

    const sid = header.recordset[0]?.SettlementID;
    if (sid) {
      const pdc = await pool.request()
        .input('sid', sid)
        .query(`SELECT * FROM PaymentDetailCur WHERE RestaurantBillId = @sid OR SettlementId = @sid`);
      console.log('=== PAYMENT DETAIL CUR ===', pdc.recordset);

      const pd = await pool.request()
        .input('sid', sid)
        .query(`SELECT * FROM PaymentDetail WHERE RestaurantBillId = @sid OR SettlementId = @sid`);
      console.log('=== PAYMENT DETAIL MASTER ===', pd.recordset);

      const sts = await pool.request()
        .input('sid', sid)
        .query(`SELECT * FROM SettlementTotalSales WHERE SettlementID = @sid`);
      console.log('=== SETTLEMENT TOTAL SALES ===', sts.recordset);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrder0005();
