const Router = require('express');
const router = new Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

router.get('/', authMiddleware, checkRole('TEACHER'), lessonController.getAll);
router.post('/', authMiddleware, checkRole('TEACHER'), lessonController.create);
router.delete('/', authMiddleware, checkRole('TEACHER'), lessonController.remove);

module.exports = router;