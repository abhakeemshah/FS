/**
 * Full Turso schema sync: DROP existing tables, CREATE from Prisma schema
 */
const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env");
const envRaw = fs.readFileSync(envPath, "utf-8");
envRaw.split("
").forEach(function(line) {
  var m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) {
    var v = m[2].trim();
    if ((v.startsWith(""") && v.endsWith(""")) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1].trim()] = v;
  }
});

var turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

var dropOrder = [
  "InvoiceItem", "ProductListItem", "PurchaseItem", "ProductVariant",
  "Invoice", "Product", "Purchase", "StaffPermission", "User",
  "Payment", "ProductList", "Category", "LandingHeroSetting",
  "BusinessSetting", "DashboardMetric", "CatalogSnapshot", "LedgerSnapshot"
];

var sqlPath = path.join(__dirname, "..", "prisma", "turso-sync.sql");
var sql = fs.readFileSync(sqlPath, "utf-8");
var stmts = sql.split(";").map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0 && s.indexOf("--") !== 0; });

async function syncSchema() {
  console.log("======= TURSO SCHEMA SYNC =======");
  
  console.log("Step 1: Dropping existing tables...");
  for (var i = 0; i < dropOrder.length; i++) {
    try { await turso.execute("DROP TABLE IF EXISTS "" + dropOrder[i] + """); } catch(e) {}
  }
  console.log("   Dropped " + dropOrder.length + " tables");
  
  console.log("Step 2: Creating tables from Prisma schema...");
  var created = 0;
  var errors = 0;
  for (var j = 0; j < stmts.length; j++) {
    try {
      await turso.execute(stmts[j] + ";");
      created++;
      if (created % 5 === 0 || j === stmts.length - 1) {
        process.stdout.write("   Progress: " + created + "/" + stmts.length);
      }
    } catch (err) {
      errors++;
      console.log("
   Error [" + j + "]: " + String(err).substring(0, 100));
    }
  }
  console.log("
   Created: " + created + ", Errors: " + errors);
  
  console.log("Step 3: Verifying tables...");
  var result = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("   Tables in Turso (" + result.rows.length + "):");
  for (var k = 0; k < result.rows.length; k++) {
    var row = result.rows[k];
    var cols = await turso.execute("PRAGMA table_info("" + row.name + "")");
    console.log("   - " + row.name + " (" + cols.rows.length + " cols)");
  }
  
  await turso.close();
  console.log("
======= SCHEMA SYNC COMPLETE =======");
}

syncSchema().catch(function(err) {
  console.error("Fatal:", err.message || err);
  process.exit(1);
});
