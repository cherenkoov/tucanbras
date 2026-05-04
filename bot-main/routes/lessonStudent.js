const Router = require('express');
const router = new Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/authMiddleware'); // только авторизация, без checkRole

router.get('/student', authMiddleware, lessonController.getForStudent);

module.exports = router;