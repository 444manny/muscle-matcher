const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, '..', 'data', 'muscle-match.sqlite');
const outPath = path.join(__dirname, '..', 'data', 'dump.sql');
if (!fs.existsSync(dbPath)) { console.error('DB not found. Run the app once first.'); process.exit(1); }
const db = new Database(dbPath);
const rows = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
let dump = "-- DB dump\nPRAGMA foreign_keys=ON;\n\n";
for (const r of rows) { dump += (r.sql||'') + ";\n\n"; }
for (const r of rows) {
  if (!r.name) continue;
  const data = db.prepare(`SELECT * FROM ${r.name}`).all();
  if (!data.length) continue;
  const cols = Object.keys(data[0]);
  for (const row of data) {
    const vals = cols.map(c => row[c] === null ? 'NULL' : typeof row[c] === 'number' ? row[c] : `'${String(row[c]).replace(/'/g,"''")}'`);
    dump += `INSERT INTO ${r.name} (${cols.join(',')}) VALUES (${vals.join(',')});\n`
  }
  dump += "\n";
}
fs.writeFileSync(outPath, dump, 'utf-8');
console.log('Wrote dump to', outPath);