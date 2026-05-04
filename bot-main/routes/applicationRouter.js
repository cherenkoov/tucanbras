const Router = require('express');
const router = new Router();
const applicationController = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

// Создание заявки (только студенты)
router.post('/create', authMiddleware, checkRole('USER'), applicationController.create);

// Получение заявок учителя (только учителя)
router.get('/teacher', authMiddleware, checkRole('TEACHER'), applicationController.getTeacherApplications);

router.get('/student', authMiddleware, checkRole('USER'), applicationController.getStudentStatus);

router.get('/status/:teacherId', authMiddleware, checkRole('USER'), applicationController.getStatus);

// Одобрение/отклонение заявки (только учителя)
router.put('/:id/:action', authMiddleware, checkRole('TEACHER'), applicationController.updateStatus);

module.exports = router;