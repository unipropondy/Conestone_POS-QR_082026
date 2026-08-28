const { poolPromise } = require("../config/db");

const tables = [
  "SettlementItemDetail",
  "MemberMaster",
  "RewardMaster",
  "RewardPointDetails",
  "CreditCustomerMaster",
  "SettlementHeader",
  "CancelRemarksMaster",
  "CartItems",
  "SettlementDiscountDetail",
  "RestaurantOrderDetailCur",
  "RestaurantOrderDetail",
  "TableMaster",
  "RestaurantOrderCur",
  "RestaurantOrder",
  "OrderSequences",
  "CompanySettings",
  "AppSettings",
  "OrderMergeHistory",
  "AIChatSessions",
  "AIChatMessages",
  "PaymentTransactionDetails",
  "CustomerCreditTransactions",
  "CustomerCreditAllocations",
  "settlement",
  "OpeningCashDenomination",
  "CashOutEntry",
  "CashInEntry",
  "ArtistCashBox",
  "DateEntry",
  "BusinessDayLog",
  "BusinessDayAuditLog",
  "CashDrawerRemarks",
  "CashDrawerLog",
  "PrintJobQueue",
  "LoyaltyCustomer",
  "LoyaltyVisit",
  "PrintReport",
  "ComboGroupMaster",
  "ComboGroupDishMapping",
  "PrintMaster",
  "DishMaster"
];

async function run() {
  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error("Could not obtain connection pool.");
      process.exit(1);
    }
    
    console.log("🔍 Checking all database tables read access & column structure...\n");
    const results = [];

    for (const table of tables) {
      try {
        const query = `SELECT TOP 1 * FROM [dbo].[${table}]`;
        const res = await pool.request().query(query);
        const countRes = await pool.request().query(`SELECT COUNT(*) as cnt FROM [dbo].[${table}]`);
        const rowCount = countRes.recordset[0].cnt;
        const columns = res.recordset.length > 0 ? Object.keys(res.recordset[0]).length : 0;
        
        results.push({
          Table: table,
          Status: "🟢 WORKING",
          Rows: rowCount,
          ColumnsSampled: columns > 0 ? `${columns} cols` : "Empty (0 rows/cols returned)"
        });
      } catch (err) {
        results.push({
          Table: table,
          Status: `🔴 FAILED: ${err.message}`,
          Rows: "N/A",
          ColumnsSampled: "N/A"
        });
      }
    }

    console.table(results);
    
    // Also test database server response time
    const start = Date.now();
    await pool.request().query("SELECT 1");
    const latency = Date.now() - start;
    console.log(`\n⚡ Database ping latency: ${latency}ms`);
    
    process.exit(0);
  } catch (err) {
    console.error("Critical error testing database tables:", err);
    process.exit(1);
  }
}

run();
