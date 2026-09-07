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

    console.log('=== Cleaning duplicate rows in SettlementTotalSales ===');
    // Keep 1 row per SettlementID and trimmed PayMode
    const res = await sql.query(`
      WITH CTE AS (
        SELECT SettlementID, PayMode,
               ROW_NUMBER() OVER (
                 PARTITION BY SettlementID, LTRIM(RTRIM(UPPER(PayMode)))
                 ORDER BY (CASE WHEN PayMode = LTRIM(RTRIM(PayMode)) THEN 1 ELSE 2 END)
               ) AS RowNum
        FROM SettlementTotalSales
      )
      DELETE FROM CTE WHERE RowNum > 1;
    `);
    console.log('Cleaned duplicate rows. Affected:', res.rowsAffected);

    // Also update remaining padded PayMode values to be trimmed
    const trimRes = await sql.query(`
      UPDATE SettlementTotalSales SET PayMode = LTRIM(RTRIM(PayMode));
    `);
    console.log('Trimmed PayMode in SettlementTotalSales. Affected:', trimRes.rowsAffected);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
