const { poolPromise } = require("../config/db");
const sql = require("mssql");

async function main() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB");

    // Let's get one table
    const tableResult = await pool.request().query("SELECT TOP 1 TableId, TableNumber FROM TableMaster");
    const table = tableResult.recordset[0];
    console.log("Testing with table:", table);

    // Let's test with userId = null
    const request1 = pool.request();
    request1.input("tableId", sql.VarChar(50), table.TableId);
    request1.input("lockedByName", sql.NVarChar, "Test Lock");
    request1.input("ModifiedBy", sql.UniqueIdentifier, null);

    const result1 = await request1.query(`
      DECLARE @temp TABLE (TableNumber NVARCHAR(50), DiningSection VARCHAR(10), ModifiedOn VARCHAR(50));

      UPDATE TableMaster 
      SET Status = 5, LockedByName = @lockedByName, TotalAmount = 0, StartTime = NULL, ModifiedBy = @ModifiedBy, ModifiedOn = GETDATE(), CustomerName = NULL, Pax = NULL
      OUTPUT INSERTED.TableNumber, INSERTED.DiningSection, CONVERT(VARCHAR, INSERTED.ModifiedOn, 126) AS ModifiedOn
      INTO @temp
      WHERE TableId = @tableId;

      SELECT * FROM @temp;
    `);
    console.log("Result with new lock query:", result1.recordset);

    // Let's unlock it back using the updated query syntax
    const request2 = pool.request();
    request2.input("tableId", sql.VarChar(50), table.TableId);
    request2.input("ModifiedBy", sql.UniqueIdentifier, null);
    const result2 = await request2.query(`
      DECLARE @temp TABLE (TableNumber NVARCHAR(50), DiningSection VARCHAR(10), ModifiedOn VARCHAR(50));

      UPDATE TableMaster 
      SET Status = 0, entry_status = NULL, LockedByName = NULL, TotalAmount = 0, StartTime = NULL, ModifiedBy = @ModifiedBy, ModifiedOn = GETDATE(), CustomerName = NULL, Pax = NULL
      OUTPUT INSERTED.TableNumber, INSERTED.DiningSection, CONVERT(VARCHAR, INSERTED.ModifiedOn, 126) AS ModifiedOn
      INTO @temp
      WHERE TableId = @tableId;

      SELECT * FROM @temp;
    `);
    console.log("Result with new unlock query:", result2.recordset);

    process.exit(0);
  } catch (err) {
    console.error("Error in query:", err);
    process.exit(1);
  }
}

main();
