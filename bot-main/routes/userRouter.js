const Router = require('express');
const multer = require('multer');
const router = new Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');


const upload = multer({ storage: multer.memoryStorage() });

// Все роуты начинаются с /user (потому что в главном router.use('/user', userRouter))
router.post('/registration', userController.registration);
router.post('/login', userController.login);
router.get('/auth', authMiddleware, userController.check);

// Правильный путь: POST /user/avatar
router.post('/avatar', upload.single('img'), authMiddleware, userController.updateAvatar);

// Если хочешь оставить /profile — можно, но лучше убрать, чтобы не дублировать
// router.put('/profile', authMiddleware, upload.single('avatar'), userController.updateProfile);

router.get('/', checkRole(['ADMIN', 'OWNER']), userController.getAll);
router.get('/:id', userController.getOne);
router.delete('/:id', checkRole(['ADMIN', 'OWNER']), userController.delete);
router.put('/:id/role', checkRole(['ADMIN', 'OWNER']), userController.updateRole);
router.post('/check-unique', userController.checkUnique);
router.post('/download-tg-avatar', authMiddleware, userController.downloadTgAvatar);

module.exports = router;