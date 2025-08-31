const path = require('path'); const fs = require('fs'); const Database = require('better-sqlite3');
const dataDir = path.join(__dirname,'..','data'); if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const dbPath = path.join(dataDir,'app.sqlite'); const db = new Database(dbPath);
const schema = fs.readFileSync(path.join(__dirname,'..','db','schema.sql'),'utf-8'); db.exec(schema);
const count = db.prepare("SELECT COUNT(*) c FROM exercises").get().c; if (!count) { const seed = fs.readFileSync(path.join(__dirname,'..','db','seed.sql'),'utf-8'); db.exec(seed); }
module.exports = { db };