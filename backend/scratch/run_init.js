const { poolPromise } = require("../config/db");
const { initDB } = require("../config/init");

async function run() {
  try {
    console.log("Starting DB Schema verification run...");
    const pool = await poolPromise;
    if (!pool) {
      console.error("Could not obtain connection pool. Exiting.");
      process.exit(1);
    }
    await initDB(pool);
    console.log("DB Schema verification completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Critical error running database initialization:", err);
    process.exit(1);
  }
}

run();
