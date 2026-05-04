const jwt = require('jsonwebtoken');
module.exports = function(allowedRoles) { // ← ИЗМЕНЕНО: allowedRoles может быть строкой или массивом
  return function (req, res, next) {
    if (req.method === "OPTIONS") {
      next();
    }
    try {
      const token = req.headers.authorization.split(' ')[1]; // Bearer asfasnfkajsfnjk
      if (!token) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const userRole = decoded.role;
      // ← ИЗМЕНЕНО: проверка на строку или массив
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      // ← ДОБАВЛЕНО: Лог для дебага (убери потом)
      console.log('🔍 checkRole: userRole=', userRole, 'required=', rolesArray);
      if (!rolesArray.includes(userRole)) {
        console.log('❌ checkRole: Access denied for role', userRole); // Лог отказа
        return res.status(403).json({ message: "Нет доступа" });
      }
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ message: "Не авторизован" });
    }
  };
};