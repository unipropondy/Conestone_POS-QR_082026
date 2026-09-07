const { poolPromise } = require('../config/db');

async function checkPrintMaster() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM PrintMaster");
    console.log("=== PrintMaster Configuration ===");
    console.table(result.recordset.map(r => ({
      PrinterId: r.PrinterId,
      PrinterName: r.PrinterName,
      PrinterType: r.PrinterType,
      KitchenTypeValue: r.KitchenTypeValue,
      PrinterIP: r.PrinterIP,
      PrinterPath: r.PrinterPath,
      IsActive: r.IsActive
    })));
    process.exit(0);
  } catch (err) {
    console.error("Error querying PrintMaster:", err.message);
    process.exit(1);
  }
}

checkPrintMaster();
