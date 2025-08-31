const Joi = require('joi');
const fetch = require('node-fetch');
const { getDb } = require('../db');

const searchSchema = Joi.object({
  muscle: Joi.string().allow('').default(''),
  equipment: Joi.string().allow('').default(''),
  difficulty: Joi.string().allow('').default(''),
  q: Joi.string().allow('').default('')
});
function searchExercises(req, res){
  const { value } = searchSchema.validate(req.query || {});
  const db = getDb();
  const clauses = []; const params = [];
  if (value.muscle) { clauses.push('m.name = ?'); params.push(value.muscle); }
  if (value.equipment) { clauses.push('e.equipment = ?'); params.push(value.equipment); }
  if (value.difficulty) { clauses.push('e.difficulty = ?'); params.push(value.difficulty); }
  if (value.q) { clauses.push('e.name LIKE ?'); params.push(`%${value.q}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT e.id, e.name, e.description, e.equipment, e.difficulty, m.name as muscle
    FROM exercises e JOIN muscles m ON m.id = e.muscle_id
    ${where} ORDER BY e.name LIMIT 100
  `).all(...params);
  db.close();
  res.json(rows);
}

const workoutSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  notes: Joi.string().allow('').max(1000).default(''),
  items: Joi.array().items(Joi.object({
    exercise_id: Joi.number().integer().required(),
    sets: Joi.number().integer().min(1).max(10).default(3),
    reps: Joi.number().integer().min(1).max(100).default(10),
    weight: Joi.number().precision(2).min(0).max(1000).default(0)
  })).default([])
});

function requireAuthJson(req, res, next){ if(!req.session.user) return res.status(401).json({ error:'Auth required' }); next(); }

function listWorkouts(req, res){
  const db = getDb();
  const workouts = db.prepare('SELECT id,name,notes,created_at FROM workouts WHERE user_id = ? ORDER BY id DESC').all(req.session.user.id);
  const ids = workouts.map(w=>w.id);
  const items = ids.length ? db.prepare(`
    SELECT we.workout_id,we.exercise_id,we.sets,we.reps,we.weight,e.name as exercise_name
    FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id
    WHERE workout_id IN (${ids.map(()=>'?').join(',')})
    ORDER BY we.rowid ASC
  `).all(...ids) : [];
  db.close();
  const grouped = {}; workouts.forEach(w=> grouped[w.id] = { ...w, items: []});
  items.forEach(it=> grouped[it.workout_id]?.items.push(it));
  res.json(Object.values(grouped));
}
function createWorkout(req, res){
  const { value, error } = workoutSchema.validate(req.body || {});
  if (error) return res.status(400).json({ error: error.message });
  const db = getDb();
  const info = db.prepare('INSERT INTO workouts (user_id,name,notes) VALUES (?,?,?)')
    .run(req.session.user.id, value.name, value.notes);
  const wid = info.lastInsertRowid;
  const insert = db.prepare('INSERT INTO workout_exercises (workout_id,exercise_id,sets,reps,weight) VALUES (?,?,?,?,?)');
  for (const it of value.items) insert.run(wid, it.exercise_id, it.sets, it.reps, it.weight);
  const row = db.prepare('SELECT id,name,notes,created_at FROM workouts WHERE id = ?').get(wid);
  db.close();
  res.status(201).json({ ...row, items: value.items });
}
function updateWorkout(req, res){
  const id = Number(req.params.id); if (!id) return res.status(400).json({ error:'Invalid id' });
  const { value, error } = workoutSchema.validate(req.body || {});
  if (error) return res.status(400).json({ error: error.message });
  const db = getDb();
  const owner = db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(id);
  if (!owner || owner.user_id !== req.session.user.id) { db.close(); return res.status(404).json({ error:'Not found' }); }
  db.prepare('UPDATE workouts SET name=?, notes=? WHERE id=?').run(value.name, value.notes, id);
  db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(id);
  const insert = db.prepare('INSERT INTO workout_exercises (workout_id,exercise_id,sets,reps,weight) VALUES (?,?,?,?,?)');
  for (const it of value.items) insert.run(id, it.exercise_id, it.sets, it.reps, it.weight);
  const row = db.prepare('SELECT id,name,notes,created_at FROM workouts WHERE id = ?').get(id);
  db.close();
  res.json({ ...row, items: value.items });
}
function deleteWorkout(req, res){
  const id = Number(req.params.id); if (!id) return res.status(400).json({ error:'Invalid id' });
  const db = getDb();
  const owner = db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(id);
  if (!owner || owner.user_id !== req.session.user.id) { db.close(); return res.status(404).json({ error:'Not found' }); }
  db.prepare('DELETE FROM workout_exercises WHERE workout_id = ?').run(id);
  db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
  db.close();
  res.json({ ok: true });
}

async function proxyWger(req, res){
  try{
    const muscle = String(req.query.muscle || '').trim();
    if (!muscle) return res.status(400).json({ error: 'muscle query required (e.g., Chest)' });
    const map = { chest:4, back:12, biceps:1, triceps:5, shoulders:2, quadriceps:10, hamstrings:11, calves:7, abs:6, glutes:8 };
    const id = map[muscle.toLowerCase()];
    if (!id) return res.status(400).json({ error: 'unknown muscle' });
    const url = `https://wger.de/api/v2/exerciseinfo/?language=2&muscles=${id}&limit=20`;
    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: 'Upstream error' });
    const data = await resp.json();
    const items = (data.results || []).map(r => ({
      name: r.name,
      description: (r.description||'').replace(/<[^>]*>/g, ''),
      equipment: (r.equipment||[]).map(e=>e.name).join(', '),
      muscles: (r.muscles||[]).map(m=>m.name_en||m.name).join(', ')
    }));
    res.json({ source:'wger', count: items.length, items });
  }catch(e){ console.error(e); res.status(500).json({ error:'Proxy failed' }); }
}

module.exports = { searchExercises, requireAuthJson, listWorkouts, createWorkout, updateWorkout, deleteWorkout, proxyWger };