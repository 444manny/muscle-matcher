const Joi = require('joi');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
}).unknown(true);
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
}).unknown(true);

async function register(req, res){
  try {
    const { value, error } = registerSchema.validate(req.body);
    if (error) return res.status(400).render('register', { error: error.message });
    const db = getDb();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(value.email);
    if (exists) { db.close(); return res.status(400).render('register', { error: 'Email already registered' }); }
    const hash = await bcrypt.hash(value.password, 10);
    const info = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(value.name, value.email, hash);
    const user = db.prepare('SELECT id,name,email,created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
    db.close();
    req.session.user = user;
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e); res.status(500).render('register', { error: 'Server error' });
  }
}
async function login(req, res){
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).render('login', { error: error.message });
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(value.email);
    db.close();
    if (!row) return res.status(400).render('login',{ error:'Invalid credentials' });
    const ok = await bcrypt.compare(value.password, row.password_hash);
    if (!ok) return res.status(400).render('login',{ error:'Invalid credentials' });
    req.session.user = { id: row.id, name: row.name, email: row.email, created_at: row.created_at };
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e); res.status(500).render('login', { error: 'Server error' });
  }
}
function logout(req, res){ req.session.destroy(()=> res.redirect('/')); }

module.exports = { register, login, logout };