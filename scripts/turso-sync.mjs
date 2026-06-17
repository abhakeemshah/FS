import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const env = readFileSync('.env','utf-8');
for (const l of env.split('\n')) {
  const m = l.match(/^\s*([^#=]+)=(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'\")&&v.endsWith("'\"))) v=v.slice(1,-1);
    process.env[m[1].trim()]=v;
  }
}

const db = createClient({url:process.env.DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
const drop = ['InvoiceItem','ProductListItem','PurchaseItem','ProductVariant','Invoice','Product','Purchase','StaffPermission','User','Payment','ProductList','Category','LandingHeroSetting','BusinessSetting','DashboardMetric','CatalogSnapshot','LedgerSnapshot'];
const sql = readFileSync('prisma/turso-sync.sql','utf-8');
const stmts = sql.split(';').map(s=>s.trim()).filter(s=>s.length>0&&!s.startsWith('--'));

async function run(){
  console.log('Dropping existing tables...');
  for (const t of drop) {
    try{await db.execute(`DROP TABLE IF EXISTS "${t}"`)}catch(e){}
  }
  console.log('Creating tables from Prisma schema...');
  let ok=0,errs=[];
  for (let i=0;i<stmts.length;i++) {
    try{await db.execute(stmts[i]+';');ok++}catch(e){errs.push(i+': '+(e.message||e).substring(0,60))}
  }
  console.log('Created '+ok+' statements ('+errs.length+' errors)');
  if(errs.length) errs.forEach(e=>console.log('  ERR: '+e));
  const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  console.log('Tables ('+r.rows.length+'):');
  for (const row of r.rows) {
    const c = await db.execute('PRAGMA table_info("'+row.name+'")');
    console.log('  '+row.name+' ('+c.rows.length+' cols)');
  }
  await db.close();
  console.log('Schema sync complete!');
}
run().catch(e=>{console.error(e.message||e);process.exit(1)});
