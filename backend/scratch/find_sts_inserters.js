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

    console.log('=== Checking Triggers on Database ===');
    const triggers = await sql.query(`
      SELECT 
        tr.name AS trigger_name,
        tbl.name AS table_name,
        OBJECT_DEFINITION(tr.object_id) AS trigger_definition
      FROM sys.triggers tr
      JOIN sys.tables tbl ON tr.parent_id = tbl.object_id
    `);
    console.log(triggers.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
