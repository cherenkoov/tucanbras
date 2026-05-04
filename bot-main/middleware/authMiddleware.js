// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authorization.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Просто кладём decoded как есть — в нём уже ВСЁ есть!
    req.user = decoded;

    // Опционально: гарантируем, что id — число (на случай старых токенов)
    if (req.user.id && typeof req.user.id !== 'number') {
      req.user.id = Number(req.user.id);
    }

    next();
  } catch (e) {
    console.error('🔴 Auth middleware error:', e.message);
    return res.status(401).json({ message: 'Не авторизован' });
  }
};