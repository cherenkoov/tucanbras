const Router = require('express');
const router = new Router();
const teacherAnketaController = require('../controllers/teacherAnketaController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.post('/create', authMiddleware, checkRole('TEACHER'), teacherAnketaController.create);
router.get('/get', authMiddleware, checkRole('TEACHER'), teacherAnketaController.getOne);
router.put('/update', authMiddleware, checkRole('TEACHER'), teacherAnketaController.update);
router.post('/update-image', authMiddleware, checkRole('TEACHER'), teacherAnketaController.updateImage);
router.get('/public', authMiddleware, teacherAnketaController.publicGetAll);
router.get('/student-view/:teacherId', authMiddleware, teacherAnketaController.getForStudent);
router.get('/all', authMiddleware, checkRole(['ADMIN', 'OWNER']), teacherAnketaController.getAll);
router.put('/admin-update/:id', authMiddleware, checkRole(['ADMIN', 'OWNER']), teacherAnketaController.adminUpdate);

module.exports = router;