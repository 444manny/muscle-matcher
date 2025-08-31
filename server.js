const express = require('express'); const path = require('path'); const { db } = require('./src/db');
const app = express(); const PORT = process.env.PORT||3000;
app.set('view engine','ejs'); app.set('views', path.join(__dirname,'src','views'));
app.use(express.static(path.join(__dirname,'public')));
app.get('/', (req,res)=> res.render('index'));
app.get('/search', (req,res)=> {
  const q = String(req.query.q||''); const muscle = String(req.query.muscle||'');
  const clauses = []; const params = [];
  if (q) { clauses.push("e.name LIKE ?"); params.push('%'+q+'%'); }
  if (muscle) { clauses.push("m.name = ?"); params.push(muscle); }
  const where = clauses.length? ('WHERE '+clauses.join(' AND ')) : '';
  const rows = db.prepare(`SELECT e.id,e.name,e.equipment,e.difficulty,m.name muscle FROM exercises e JOIN muscles m ON m.id=e.muscle_id ${where} ORDER BY e.name LIMIT 50`).all(...params);
  res.render('search', { rows, q, muscle });
});
app.listen(PORT, ()=> console.log('Muscle Match on http://localhost:'+PORT));