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

    console.log('=== Testing Deduplicated STS Query ===');
    const query = `
      SELECT sh.BillNo, sh.SettlementID, sts.PayMode, sts.SysAmount
      FROM SettlementHeader sh
      LEFT JOIN (
        SELECT SettlementID, LTRIM(RTRIM(PayMode)) as PayMode, AVG(SysAmount) as SysAmount
        FROM SettlementTotalSales
        GROUP BY SettlementID, LTRIM(RTRIM(PayMode))
      ) sts ON sh.SettlementID = sts.SettlementID
      WHERE sh.BillNo LIKE '20260907-%'
      ORDER BY sh.BillNo DESC
    `;
    const res = await sql.query(query);
    console.log(res.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
