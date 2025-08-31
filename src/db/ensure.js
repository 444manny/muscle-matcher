const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function ensureDb() {
  const dataDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  const dbPath = path.join(dataDir, 'muscle-match.sqlite');
  const first = !fs.existsSync(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf-8');
  db.exec(schema);
  if (first) {
    const seed = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'seed.sql'), 'utf-8');
    db.exec(seed);
  }
  db.close();
}
module.exports = { ensureDb };