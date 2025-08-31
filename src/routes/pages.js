const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function renderWithLayout(view){
  return (req, res) => {
    res.render(view, {}, (err, html) => {
      if (err) return res.status(500).render('error', { error: err.message });
      res.render('layout', { body: html });
    });
  };
}

router.get('/', renderWithLayout('index'));
router.get('/search', renderWithLayout('search'));
router.get('/dashboard', requireAuth, renderWithLayout('dashboard'));

module.exports = router;