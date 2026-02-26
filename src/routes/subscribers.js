const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/subscribers — добавить нового подписчика
// Это вызывается когда человек вводит email на landing page
router.post('/', async (req, res) => {
  const { email, name } = req.body;

  // Проверяем что email передан
  if (!email) {
    return res.status(400).json({ error: 'Email обязателен' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO subscribers (email, name) VALUES ($1, $2) RETURNING *',
      [email, name]
    );

    res.status(201).json({
      message: '✅ Подписчик добавлен!',
      subscriber: result.rows[0]
    });

  } catch (err) {
    // Если email уже существует
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
    }
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/subscribers — получить всех подписчиков (для admin panel)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscribers ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;