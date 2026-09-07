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
    const sid = 'CACF6359-B452-45AD-AAA3-0CD9153E08A9';

    console.log('=== PaymentTransactionDetails ===');
    const ptd = await sql.query(`SELECT * FROM PaymentTransactionDetails WHERE ReferenceId = '${sid}'`);
    console.log(ptd.recordset);

    console.log('=== PaymentDetailCur ===');
    const pdc = await sql.query(`SELECT * FROM PaymentDetailCur WHERE RestaurantBillId = '${sid}'`);
    console.log(pdc.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
