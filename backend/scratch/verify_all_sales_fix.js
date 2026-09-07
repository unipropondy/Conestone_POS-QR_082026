const sql = require('mssql');
require('dotenv').config();
const { getReportDateWhereSqlForRange, normalizeReportPayModeSql } = require('../utils/reportDataFetcher');

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

    const shWhere = "sh.LastSettlementDate >= '2026-09-07' AND sh.LastSettlementDate <= '2026-09-07 23:59:59'";
    const queryStr = `
      SELECT * FROM (
         SELECT 
           sh.SettlementID, 
           sh.LastSettlementDate AS SettlementDate, 
           COALESCE(sh.start_date, CAST(sh.LastSettlementDate AS DATE)) AS BusinessDate,
           sh.BillNo AS OrderId, 
           sh.OrderType,
           sh.TableNo, 
           sh.Section, 
           sh.CashierId, 
           sh.BillNo, 
           sh.SER_NAME,
           sts.PayMode as PayMode,
           ISNULL(sts.SysAmount, sh.SysAmount) as SysAmount,
           ISNULL(sts.ManualAmount, sh.ManualAmount) as ManualAmount
         FROM SettlementHeader sh
         LEFT JOIN (
           SELECT SettlementID, LTRIM(RTRIM(PayMode)) AS PayMode, AVG(SysAmount) AS SysAmount, AVG(ManualAmount) AS ManualAmount, MAX(ReceiptCount) AS ReceiptCount
           FROM SettlementTotalSales
           GROUP BY SettlementID, LTRIM(RTRIM(PayMode))
         ) sts ON sh.SettlementID = sts.SettlementID
         WHERE ${shWhere}
      ) sales
      WHERE BillNo LIKE '20260907-%'
      ORDER BY SettlementDate DESC
    `;

    const res = await sql.query(queryStr);
    console.log('=== GET /api/sales/all result ===');
    console.log(res.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
