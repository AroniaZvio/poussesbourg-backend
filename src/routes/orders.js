const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/orders — создать заказ
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customer, items, delivery_date, delivery_address, notes } = req.body;

    // Валидация
    if (!customer?.email || !items?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email клиента и товары обязательны' 
      });
    }

    await client.query('BEGIN');

    // 1. Найти или создать клиента
    let customerResult = await client.query(
      `SELECT id FROM customers WHERE email = $1`, 
      [customer.email]
    );

    let customerId;
    if (customerResult.rows.length) {
      customerId = customerResult.rows[0].id;
    } else {
      const newCustomer = await client.query(
        `INSERT INTO customers (email, name, phone, type, address, city, postal_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          customer.email,
          customer.name || '',
          customer.phone || '',
          customer.type || 'individual',
          customer.address || '',
          customer.city || '',
          customer.postal_code || ''
        ]
      );
      customerId = newCustomer.rows[0].id;
    }

    // 2. Подсчитать сумму заказа
    let total = 0;
    const enrichedItems = [];

    for (const item of items) {
      const priceResult = await client.query(
        `SELECT pr.price_eur, p.name_fr, s.available_g
         FROM prices pr
         JOIN products p ON p.id = pr.product_id
         LEFT JOIN stock s ON s.product_id = pr.product_id
         WHERE pr.id = $1 AND pr.active = true`,
        [item.price_id]
      );

      if (!priceResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: `Цена не найдена: ${item.price_id}` 
        });
      }

      const price = priceResult.rows[0];
      total += price.price_eur * item.quantity;
      enrichedItems.push({ ...item, unit_price: price.price_eur });
    }

    // 3. Создать заказ
    const orderResult = await client.query(
      `INSERT INTO orders 
        (customer_id, status, total, delivery_date, delivery_address, notes, payment_status)
       VALUES ($1, 'new', $2, $3, $4, $5, 'pending') 
       RETURNING id, created_at`,
      [customerId, total, delivery_date || null, delivery_address || '', notes || '']
    );

    const orderId = orderResult.rows[0].id;

    // 4. Добавить позиции заказа
    for (const item of enrichedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, weight_g)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, item.unit_price, item.weight_g]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        order_id: orderId,
        total,
        status: 'new',
        created_at: orderResult.rows[0].created_at
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/orders/:id — статус заказа
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        o.id, o.status, o.total, o.delivery_date, 
        o.delivery_address, o.notes, o.payment_status, o.created_at,
        c.name as customer_name, c.email as customer_email,
        json_agg(json_build_object(
          'product_name', p.name_fr,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'weight_g', oi.weight_g
        )) as items
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.id = $1
      GROUP BY o.id, c.name, c.email
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/customer/:email — история клиента
router.get('/customer/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(`
      SELECT o.id, o.status, o.total, o.delivery_date, o.payment_status, o.created_at
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.email = $1
      ORDER BY o.created_at DESC
    `, [email]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;