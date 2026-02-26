const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/products — все продукты с ценами и остатками
router.get('/', async (req, res) => {
  try {
    const { category, type = 'b2c', available } = req.query;

    let query = `
      SELECT 
        p.id, p.name_fr, p.name_ru, p.description_fr, p.description_ru,
        p.image_url, p.grow_days, p.status,
        c.name as category_name, c.slug as category_slug,
        COALESCE(s.available_g, 0) as available_g,
        json_agg(
          json_build_object(
            'id', pr.id,
            'weight_g', pr.weight_g,
            'price_eur', pr.price_eur,
            'price_type', pr.price_type
          ) ORDER BY pr.weight_g
        ) FILTER (WHERE pr.id IS NOT NULL AND pr.price_type = $1) as prices
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON s.product_id = p.id
      LEFT JOIN prices pr ON pr.product_id = p.id AND pr.active = true
      WHERE p.status = 'active'
    `;

    const params = [type];
    let paramIndex = 2;

    if (category) {
      query += ` AND c.slug = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (available === 'true') {
      query += ` AND COALESCE(s.available_g, 0) > 0`;
    }

    query += ` GROUP BY p.id, c.name, c.slug, s.available_g ORDER BY p.id`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/:id — один продукт
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE(s.available_g, 0) as available_g,
        json_agg(
          json_build_object(
            'id', pr.id,
            'weight_g', pr.weight_g,
            'price_eur', pr.price_eur,
            'price_type', pr.price_type
          ) ORDER BY pr.weight_g
        ) FILTER (WHERE pr.id IS NOT NULL) as prices
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON s.product_id = p.id
      LEFT JOIN prices pr ON pr.product_id = p.id AND pr.active = true
      WHERE p.id = $1
      GROUP BY p.id, c.name, s.available_g
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Продукт не найден' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;