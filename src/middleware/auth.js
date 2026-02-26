const jwt = require('jsonwebtoken');

// Этот middleware проверяет токен перед каждым защищённым запросом
function authMiddleware(req, res, next) {
  // Токен приходит в заголовке Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет доступа — требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // добавляем данные админа в запрос
    next(); // пропускаем дальше
  } catch (err) {
    return res.status(401).json({ error: 'Токен недействителен' });
  }
}

module.exports = authMiddleware;