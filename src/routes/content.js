const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sendNewContentEmail } = require('../email');

// GET /api/content — опубликованный контент для сайта
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM content_items 
       WHERE is_published = TRUE 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/content/all — весь контент для админа
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM content_items ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/content — добавить контент
router.post('/', async (req, res) => {
  const { title, body, category } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Заголовок обязателен' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO content_items (title, body, category) 
       VALUES ($1, $2, $3) RETURNING *`,
      [title, body, category]
    );

    res.status(201).json({
      message: '✅ Контент добавлен!',
      item: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/content/:id/publish — опубликовать и отправить email
router.patch('/:id/publish', async (req, res) => {
  const { id } = req.params;

  try {
    // Публикуем контент
    const result = await pool.query(
      `UPDATE content_items SET is_published = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    const content = result.rows[0];

    // Получаем всех подписчиков
    const subscribers = await pool.query('SELECT email FROM subscribers');

    // Отправляем email уведомление
    await sendNewContentEmail(
      subscribers.rows,
      content.title,
      content.category
    );

    res.json({
      message: '✅ Контент опубликован и подписчики уведомлены!',
      item: content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;