require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const csrf = require('csurf');

const { ensureDb } = require('./src/db/ensure');
const pagesRouter = require('./src/routes/pages');
const authRouter = require('./src/routes/auth');
const apiRouter = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

ensureDb();

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000*60*60*24*7 }
}));

// CSRF for HTML forms (skip JSON API)
const csrfProtection = csrf();
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return csrfProtection(req, res, next);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.user = req.session.user || null;
  next();
});

app.use('/', pagesRouter);
app.use('/auth', authRouter);
app.use('/api', apiRouter);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error' });
  res.status(500).render('error', { error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`Muscle Match running at http://localhost:${PORT}`));