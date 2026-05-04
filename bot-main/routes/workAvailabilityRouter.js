const Router = require('express');
const router = new Router();
const workAvailabilityController = require('../controllers/workAvailabilityController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole'); // ← Твой middleware для проверки роли

// Чтение — доступно всем авторизованным (TEACHER видит свои, ADMIN/OWNER — всех)
router.get('/', authMiddleware, workAvailabilityController.getAll);

// Создание, удаление, массовое удаление — ТОЛЬКО TEACHER
router.post('/', authMiddleware, checkRole('TEACHER'), workAvailabilityController.create);
router.delete('/', authMiddleware, checkRole('TEACHER'), workAvailabilityController.remove);
router.delete('/bulk', authMiddleware, checkRole('TEACHER'), workAvailabilityController.bulkRemove);

module.exports = router;