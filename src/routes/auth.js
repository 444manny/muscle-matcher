const express = require('express');
const { register, login, logout } = require('../controllers/auth');
const router = express.Router();
router.get('/login', (req,res)=> res.render('login', { error:null }));
router.get('/register', (req,res)=> res.render('register', { error:null }));
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
module.exports = router;