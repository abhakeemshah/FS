const { createClient } = require('@libsql/client');
const fs = require('fs');

const envRaw = fs.readFileSync('.env', 'utf8');
const lines = envRaw.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1].trim()] = v;
  }
}

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Read SQL and remove comment lines FIRST
let sql = fs.readFileSync('prisma/turso-sync.sql', 'utf8');
sql = sql.replace(/^--.*$/gm, '');

const stmts = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log('Statements to execute: ' + stmts.length);

async function run() {
  let ok = 0;
  let errs = 0;
  for (let i = 0; i < stmts.length; i++) {
    try {
      await turso.execute(stmts[i] + ';');
      ok++;
      if (ok % 10 === 0 || i === stmts.length - 1) {
        process.stdout.write('\r  Progress: ' + ok + '/' + stmts.length);
      }
    } catch (e) {
      errs++;
    }
  }
  console.log('\nCreated: ' + ok + ', Errors: ' + errs);
  
  const result = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  console.log('\nTables (' + result.rows.length + '):');
  for (const row of result.rows) {
    const info = await turso.execute('PRAGMA table_info("' + row.name + '")');
    console.log('  ' + row.name + ' (' + info.rows.length + ' cols)');
  }
  
  await turso.close();
  console.log('\nSchema sync complete!');
}

run().catch(function(err) {
  console.error('Error:', err.message || err);
  process.exit(1);
});
