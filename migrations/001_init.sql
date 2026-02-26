-- КАТЕГОРИИ
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ПРОДУКТЫ
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name_fr VARCHAR(200) NOT NULL,
  name_ru VARCHAR(200),
  description_fr TEXT,
  description_ru TEXT,
  category_id INTEGER REFERENCES categories(id),
  image_url TEXT,
  grow_days INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ЦЕНЫ
CREATE TABLE prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  weight_g INTEGER NOT NULL,
  price_eur DECIMAL(10,2) NOT NULL,
  price_type VARCHAR(10) DEFAULT 'b2c',
  active BOOLEAN DEFAULT true
);

-- КЛИЕНТЫ
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  name VARCHAR(200),
  phone VARCHAR(50),
  type VARCHAR(20) DEFAULT 'individual',
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ЗАКАЗЫ
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  status VARCHAR(30) DEFAULT 'new',
  total DECIMAL(10,2),
  delivery_date DATE,
  delivery_address TEXT,
  notes TEXT,
  payment_status VARCHAR(30) DEFAULT 'pending',
  payment_intent_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ПОЗИЦИИ ЗАКАЗА
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  weight_g INTEGER
);

-- СКЛАД
CREATE TABLE stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  available_g INTEGER DEFAULT 0,
  harvest_date DATE,
  batch_no VARCHAR(50),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ПОДПИСКИ
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  frequency VARCHAR(20) DEFAULT 'weekly',
  next_delivery DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- РАССЫЛКА
CREATE TABLE newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  language VARCHAR(5) DEFAULT 'fr',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ЗОНЫ ДОСТАВКИ
CREATE TABLE delivery_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  postal_codes TEXT[],
  fee DECIMAL(10,2) DEFAULT 0,
  min_order DECIMAL(10,2) DEFAULT 0
);

-- ИНДЕКСЫ
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_stock_product ON stock(product_id);
CREATE INDEX idx_prices_product ON prices(product_id);

-- SEED: КАТЕГОРИИ
INSERT INTO categories (name, slug, icon, sort_order) VALUES
('Salades & Épinards', 'salades', '🥗', 1),
('Herbes aromatiques', 'herbes', '🌿', 2),
('Céréales & Graines', 'cereales', '🌾', 3),
('Fleurs comestibles', 'fleurs', '🌸', 4);

-- SEED: ПРОДУКТЫ
INSERT INTO products (name_fr, name_ru, description_fr, category_id, grow_days, status) VALUES
('Tournesol', 'Подсолнух', 'Riche en vitamines E et B, goût de noisette', 1, 10, 'active'),
('Radis', 'Редис', 'Saveur piquante, riche en vitamine C', 1, 7, 'active'),
('Pois gourmand', 'Горох', 'Doux et croquant, riche en protéines', 1, 12, 'active'),
('Basilic', 'Базилик', 'Arôme intense, parfait pour les plats italiens', 2, 14, 'active'),
('Coriandre', 'Кинза', 'Saveur fraîche et citronnée', 2, 14, 'active'),
('Blé', 'Пшеница', 'Riche en chlorophylle et minéraux', 3, 9, 'active');

-- SEED: ЦЕНЫ
INSERT INTO prices (product_id, weight_g, price_eur, price_type) VALUES
(1, 50, 4.50, 'b2c'), (1, 100, 8.00, 'b2c'), (1, 200, 14.00, 'b2c'),
(1, 500, 25.00, 'b2b'), (1, 1000, 45.00, 'b2b'),
(2, 50, 3.50, 'b2c'), (2, 100, 6.50, 'b2c'), (2, 500, 20.00, 'b2b'),
(3, 50, 4.00, 'b2c'), (3, 100, 7.50, 'b2c'), (3, 500, 22.00, 'b2b'),
(4, 50, 5.00, 'b2c'), (4, 100, 9.00, 'b2c'), (4, 500, 28.00, 'b2b'),
(5, 50, 4.50, 'b2c'), (5, 100, 8.00, 'b2c'), (5, 500, 24.00, 'b2b'),
(6, 50, 3.00, 'b2c'), (6, 100, 5.50, 'b2c'), (6, 500, 18.00, 'b2b');

-- SEED: СКЛАД
INSERT INTO stock (product_id, available_g, harvest_date) VALUES
(1, 2000, CURRENT_DATE + 3),
(2, 1500, CURRENT_DATE + 2),
(3, 3000, CURRENT_DATE + 5),
(4, 800, CURRENT_DATE + 7),
(5, 1200, CURRENT_DATE + 7),
(6, 2500, CURRENT_DATE + 2);

-- SEED: ЗОНА ДОСТАВКИ
INSERT INTO delivery_zones (name, postal_codes, fee, min_order) VALUES
('Strasbourg Centre', ARRAY['67000','67100'], 0.00, 20.00),
('Strasbourg Périphérie', ARRAY['67200','67400'], 3.00, 30.00),
('Alsace', ARRAY['67300','67500','68000'], 5.00, 50.00);