const sql = require('mssql');
require('dotenv').config();

(async () => {
  try {
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      port: parseInt(process.env.DB_PORT || '1433'),
      database: process.env.DB_NAME,
      options: { encrypt: false, trustServerCertificate: true }
    };
    await sql.connect(config);
    const billNo = '20260907-0007';
    console.log('=== SettlementHeader ===');
    const sh = await sql.query(`SELECT SettlementID, BillNo, SysAmount, ManualAmount FROM SettlementHeader WHERE BillNo = '${billNo}'`);
    console.log(sh.recordset);
    if (sh.recordset.length > 0) {
      const sid = sh.recordset[0].SettlementID;
      console.log('Found SettlementID:', sid);

      console.log('=== SettlementTotalSales ===');
      const sts = await sql.query(`SELECT * FROM SettlementTotalSales WHERE SettlementID = '${sid}'`);
      console.log(sts.recordset);

      console.log('=== PaymentTransactionDetails ===');
      const ptd = await sql.query(`SELECT * FROM PaymentTransactionDetails WHERE SettlementID = '${sid}'`);
      console.log(ptd.recordset);

      console.log('=== SettlementDetail ===');
      const sd = await sql.query(`SELECT * FROM SettlementDetail WHERE SettlementID = '${sid}'`);
      console.log(sd.recordset);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
