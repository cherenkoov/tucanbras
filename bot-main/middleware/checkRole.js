const jwt = require('jsonwebtoken');

module.exports = function (allowedRoles) {
  // allowedRoles может быть строкой (например 'TEACHER') или массивом (например ['ADMIN', 'OWNER'])

  return function (req, res, next) {
    if (req.method === "OPTIONS") {
      return next();
    }

    try {
      const authorization = req.headers.authorization;

      if (!authorization) {
        return res.status(401).json({ message: "Не авторизован" });
      }

      const token = authorization.split(' ')[1]; // Bearer <token>

      if (!token) {
        return res.status(401).json({ message: "Не авторизован" });
      }

      const decoded = jwt.verify(token, process.env.SECRET_KEY);

      const userRole = decoded.role;

      // Приводим allowedRoles к массиву для удобной проверки
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Логи для удобной отладки (можно убрать в продакшене)
      console.log('🔍 checkRole: userRole=', userRole, 'required=', rolesArray);

      if (!rolesArray.includes(userRole)) {
        console.log('❌ checkRole: Access denied for role', userRole);
        return res.status(403).json({ message: "Нет доступа" });
      }

      // Добавляем расшифрованного пользователя в запрос
      req.user = decoded;

      next();
    } catch (e) {
      console.error('JWT verification error:', e.message);
      return res.status(401).json({ message: "Не авторизован" });
    }
  };
};