-- Создать таблицу daily_deal
CREATE TABLE IF NOT EXISTS daily_deal (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL DEFAULT 'Offre du jour',
  description TEXT DEFAULT '',
  discount_percent INTEGER NOT NULL DEFAULT 20,
  image_url TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Добавить начальную запись
INSERT INTO daily_deal (product_name, description, discount_percent, image_url, active)
VALUES (
  'Tournesol',
  'Riche en vitamine E, goût de noisette. Récolté ce matin !',
  20,
  '',
  true
);
