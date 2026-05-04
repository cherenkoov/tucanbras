// routes/weeklyWorkScheduleRouter.js
const Router = require('express');
const router = new Router();
const weeklyWorkScheduleController = require('../controllers/weeklyWorkScheduleController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, weeklyWorkScheduleController.get);
router.post('/', authMiddleware, weeklyWorkScheduleController.save);

module.exports = router;