const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./src/db');
const authMiddleware = require('./src/middleware/auth');

const authRouter = require('./src/routes/auth');
const productsRouter = require('./src/routes/products');
const categoriesRouter = require('./src/routes/categories');
const ordersRouter = require('./src/routes/orders');
const adminRouter = require('./src/routes/admin');
const newsletterRouter = require('./src/routes/newsletter');
const dailyDealRouter = require('./src/routes/daily-deal');


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// Публичные маршруты
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/daily-deal', dailyDealRouter);


app.get('/', (req, res) => {
  res.json({
    message: '🌱 Poussesbourg API работает!',
    version: '1.0.0',
    endpoints: [
      'GET  /api/products',
  'GET  /api/products/:id',
  'GET  /api/categories',
  'POST /api/orders',
  'GET  /api/orders/:id',
  'GET  /api/orders/customer/:email',
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});