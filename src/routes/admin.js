const express = require('express');
const router = express.Router();
const pool = require('../db');

// ==================== ПРОДУКТЫ ====================

// GET /api/admin/products — все продукты
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name,
        COALESCE(s.available_g, 0) as available_g,
        COUNT(oi.id) as total_orders
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      GROUP BY p.id, c.name, s.available_g
      ORDER BY p.id
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products — добавить продукт
router.post('/products', async (req, res) => {
  try {
    const { name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days } = req.body;
    if (!name_fr) return res.status(400).json({ success: false, error: 'name_fr обязателен' });

    const result = await pool.query(
      `INSERT INTO products (name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/products/:id — обновить продукт
router.patch('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days, status } = req.body;

    const result = await pool.query(
      `UPDATE products SET
        name_fr = COALESCE($1, name_fr),
        name_ru = COALESCE($2, name_ru),
        description_fr = COALESCE($3, description_fr),
        description_ru = COALESCE($4, description_ru),
        category_id = COALESCE($5, category_id),
        image_url = COALESCE($6, image_url),
        grow_days = COALESCE($7, grow_days),
        status = COALESCE($8, status)
       WHERE id = $9 RETURNING *`,
      [name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days, status, id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Продукт не найден' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/products/:id — полное обновление продукта + цены
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days, is_active, prices } = req.body;

    if (!name_fr) return res.status(400).json({ success: false, error: 'name_fr обязателен' });

    // Обновляем продукт
    const result = await pool.query(
      `UPDATE products SET
        name_fr = $1, name_ru = $2,
        description_fr = $3, description_ru = $4,
        category_id = $5, image_url = $6,
        grow_days = $7, is_active = $8
       WHERE id = $9 RETURNING *`,
      [name_fr, name_ru, description_fr, description_ru, category_id, image_url, grow_days, is_active !== false, id]
    );

    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Продукт не найден' });

    // Обновляем цены если переданы
    if (prices && Array.isArray(prices)) {
      // Удаляем старые b2c цены
      await pool.query(`DELETE FROM prices WHERE product_id = $1 AND price_type = 'b2c'`, [id]);
      // Вставляем новые
      for (const p of prices) {
        if (p && p.price_eur) {
          await pool.query(
            `INSERT INTO prices (product_id, weight_g, price_eur, price_type, active)
             VALUES ($1, $2, $3, $4, true)`,
            [id, p.weight_g, p.price_eur, p.price_type || 'b2c']
          );
        }
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/products/:id — удалить продукт
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE products SET status = 'deleted' WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Продукт удалён' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ЦЕНЫ ====================

// GET /api/admin/products/:id/prices — цены продукта
router.get('/products/:id/prices', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM prices WHERE product_id = $1 ORDER BY price_type, weight_g`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products/:id/prices — добавить цену
router.post('/products/:id/prices', async (req, res) => {
  try {
    const { weight_g, price_eur, price_type } = req.body;
    const result = await pool.query(
      `INSERT INTO prices (product_id, weight_g, price_eur, price_type)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, weight_g, price_eur, price_type || 'b2c']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/prices/:id — обновить цену
router.patch('/prices/:id', async (req, res) => {
  try {
    const { price_eur, active } = req.body;
    const result = await pool.query(
      `UPDATE prices SET 
        price_eur = COALESCE($1, price_eur),
        active = COALESCE($2, active)
       WHERE id = $3 RETURNING *`,
      [price_eur, active, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ЗАКАЗЫ ====================

// GET /api/admin/orders — все заказы
router.get('/orders', async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = `
      SELECT o.id, o.status, o.total, o.delivery_date, 
             o.payment_status, o.created_at,
             c.name as customer_name, c.email as customer_email,
             c.phone as customer_phone, c.type as customer_type
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status) { query += ` AND o.status = $${i++}`; params.push(status); }
    if (date) { query += ` AND o.delivery_date::date = $${i++}`; params.push(date); }

    query += ` ORDER BY o.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/orders/:id/status — обновить статус заказа
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Неверный статус' });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== СКЛАД ====================

// PATCH /api/admin/stock/:product_id — обновить остаток
router.patch('/stock/:product_id', async (req, res) => {
  try {
    const { available_g, harvest_date } = req.body;
    const result = await pool.query(
      `INSERT INTO stock (product_id, available_g, harvest_date, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (product_id) 
       DO UPDATE SET available_g = $2, harvest_date = $3, updated_at = NOW()
       RETURNING *`,
      [req.params.product_id, available_g, harvest_date]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ДАШБОРД ====================

// GET /api/admin/dashboard — статистика
router.get('/dashboard', async (req, res) => {
  try {
    const [orders, revenue, products, stock] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='new') as new_orders FROM orders`),
      pool.query(`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status='paid'`),
      pool.query(`SELECT COUNT(*) as total FROM products WHERE status='active'`),
      pool.query(`SELECT COUNT(*) as low FROM stock WHERE available_g < 500`),
    ]);

    res.json({
      success: true,
      data: {
        orders_total: orders.rows[0].total,
        orders_new: orders.rows[0].new_orders,
        revenue_total: revenue.rows[0].total,
        products_active: products.rows[0].total,
        stock_low: stock.rows[0].low,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;