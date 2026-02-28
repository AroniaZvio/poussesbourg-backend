const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../public/uploads/daily-deal');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `deal-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/daily-deal — получить активную скидку дня
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM daily_deal WHERE active = true ORDER BY updated_at DESC LIMIT 1'
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/daily-deal/:id — обновить скидку дня
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, description, discount_percent } = req.body;

    // Если загружено новое фото
    let imageUrl = null;
    if (req.file) {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      imageUrl = `${baseUrl}/uploads/daily-deal/${req.file.filename}`;
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (product_name) { updates.push(`product_name = $${i++}`); params.push(product_name); }
    if (description !== undefined) { updates.push(`description = $${i++}`); params.push(description); }
    if (discount_percent) { updates.push(`discount_percent = $${i++}`); params.push(parseInt(discount_percent)); }
    if (imageUrl) { updates.push(`image_url = $${i++}`); params.push(imageUrl); }
    updates.push(`updated_at = $${i++}`);
    params.push(new Date());
    params.push(id);

    const result = await pool.query(
      `UPDATE daily_deal SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Offre non trouvée' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
