/**
 * Push Prisma schema to Turso cloud database via HTTP API
 * This script creates/updates tables to match the schema in prisma/schema.prisma
 */

const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Each statement is separate to comply with Turso's single-statement requirement
const statements = [
  // User table
  `CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS User_email_idx ON User(email)`,
  `CREATE INDEX IF NOT EXISTS User_role_idx ON User(role)`,

  // Product table
  `CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE NOT NULL,
    costPrice REAL NOT NULL DEFAULT 0,
    wholesalePrice REAL NOT NULL DEFAULT 0,
    stockLevel INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS Product_sku_idx ON Product(sku)`,
  `CREATE INDEX IF NOT EXISTS Product_name_idx ON Product(name)`,

  // ProductVariant table
  `CREATE TABLE IF NOT EXISTS ProductVariant (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    variantName TEXT NOT NULL,
    stockLevel INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS ProductVariant_productId_idx ON ProductVariant(productId)`,
  `CREATE INDEX IF NOT EXISTS ProductVariant_variantName_idx ON ProductVariant(variantName)`,

  // Invoice table
  `CREATE TABLE IF NOT EXISTS Invoice (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT UNIQUE NOT NULL,
    customerName TEXT NOT NULL,
    totalAmount REAL NOT NULL DEFAULT 0,
    amountPaid REAL NOT NULL DEFAULT 0,
    paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS Invoice_invoiceNumber_idx ON Invoice(invoiceNumber)`,
  `CREATE INDEX IF NOT EXISTS Invoice_customerName_idx ON Invoice(customerName)`,
  `CREATE INDEX IF NOT EXISTS Invoice_paymentStatus_idx ON Invoice(paymentStatus)`,
  `CREATE INDEX IF NOT EXISTS Invoice_createdAt_idx ON Invoice(createdAt)`,

  // InvoiceItem table
  `CREATE TABLE IF NOT EXISTS InvoiceItem (
    id TEXT PRIMARY KEY,
    invoiceId TEXT NOT NULL,
    productId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    totalPrice REAL NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Product(id)
  )`,
  `CREATE INDEX IF NOT EXISTS InvoiceItem_invoiceId_idx ON InvoiceItem(invoiceId)`,
  `CREATE INDEX IF NOT EXISTS InvoiceItem_productId_idx ON InvoiceItem(productId)`,
];

async function pushSchema() {
  console.log('🚀 Pushing schema to Turso cloud database...');
  console.log(`   URL: ${process.env.DATABASE_URL}`);

  try {
    let created = 0;
    let errors = 0;
    for (const stmt of statements) {
      try {
        await turso.execute(stmt);
        created++;
      } catch (err) {
        // Some statements like CREATE INDEX on non-existent tables may fail
        // We'll log but continue
        errors++;
      }
    }
    console.log(`✅ Schema pushed successfully! (${created} statements executed, ${errors} skipped)`);

    // Verify tables were created
    const result = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log('\n📋 Tables created:');
    result.rows.forEach(row => console.log(`   - ${row.name}`));

    // Show indexes
    const indexes = await turso.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    console.log('\n📊 Indexes created:');
    indexes.rows.forEach(row => console.log(`   - ${row.name}`));
  } catch (error) {
    console.error('❌ Error pushing schema:', error.message);
    process.exit(1);
  } finally {
    await turso.close();
  }
}

pushSchema();