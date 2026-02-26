const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/survey — сохранить ответ на опрос
router.post('/', async (req, res) => {
  const { subscriber_id, category, problem_description, expat_type } = req.body;

  if (!category || !expat_type) {
    return res.status(400).json({ error: 'Категория и тип экспата обязательны' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO survey_responses 
       (subscriber_id, category, problem_description, expat_type) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [subscriber_id, category, problem_description, expat_type]
    );

    res.status(201).json({
      message: '✅ Ответ сохранён!',
      response: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/survey — получить все ответы (для admin panel)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, s.email, s.name 
       FROM survey_responses sr
       LEFT JOIN subscribers s ON sr.subscriber_id = s.id
       ORDER BY sr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;