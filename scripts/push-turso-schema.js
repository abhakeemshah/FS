/**
 * Push Prisma schema to Turso cloud database via HTTP API
 * Reads migration SQL from prisma/migrations/ and executes against Turso
 */
const { createClient } = require('@libsql/client');
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

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20260508151926_init', 'migration.sql');
let sql = fs.readFileSync(migrationPath, 'utf-8');

// Remove comment lines (lines starting with --)
sql = sql.replace(/^--.*$/gm, '');

// Split into individual statements by semicolon
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function pushSchema() {
  console.log('🚀 Pushing schema to Turso cloud database...');
  console.log('   Statements found: ' + statements.length);

  try {
    let created = 0;
    let errors = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await turso.execute(stmt + ';');
        created++;
        if (created % 5 === 0 || i === statements.length - 1) {
          process.stdout.write('\r   Progress: ' + created + '/' + statements.length);
        }
      } catch (err) {
        const msg = String(err);
        if (msg.includes('already exists')) {
          created++;
        } else {
          errors++;
        }
      }
    }
    console.log('\n✅ Schema pushed! (' + created + ' executed, ' + errors + ' skipped)');

    const result = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log('\n📋 Tables in Turso:');
    result.rows.forEach(row => console.log('   - ' + row.name));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await turso.close();
  }
}

pushSchema();
