const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/newsletter/subscribe — подписаться
router.post('/subscribe', async (req, res) => {
  try {
    const { email, language = 'fr' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' });
    }

    // Проверить уже подписан?
    const existing = await pool.query(
      'SELECT id FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existing.rows.length) {
      return res.json({ success: true, message: 'Déjà abonné', already: true });
    }

    await pool.query(
      'INSERT INTO newsletter_subscribers (email, language) VALUES ($1, $2)',
      [email, language]
    );

    res.status(201).json({ success: true, message: 'Abonné avec succès!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/newsletter/subscribers — список подписчиков (admin)
router.get('/subscribers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, language, created_at
      FROM newsletter_subscribers
      ORDER BY created_at DESC
    `);

    const total = result.rows.length;
    const today = result.rows.filter(r =>
      new Date(r.created_at).toDateString() === new Date().toDateString()
    ).length;

    res.json({
      success: true,
      data: result.rows,
      stats: { total, today }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/newsletter/subscribers/:id — удалить подписчика
router.delete('/subscribers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM newsletter_subscribers WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Désabonné' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;