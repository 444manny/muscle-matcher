const path = require('path');
const Database = require('better-sqlite3');
function getDb() {
  const dbPath = path.join(__dirname, '..', '..', 'data', 'muscle-match.sqlite');
  const db = new Database(dbPath, { fileMustExist: true });
  db.pragma('journal_mode = WAL');
  return db;
}
module.exports = { getDb };