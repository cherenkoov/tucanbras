const Router = require('express');
const router = new Router();

const userRouter = require('./userRouter');
const teacherAnketaRouter = require('./teacherAnketaRouter');
const applicationRouter = require('./applicationRouter');
const workAvailabilityRouter = require('./workAvailabilityRouter');
const weeklyWorkScheduleRouter = require('./weeklyWorkScheduleRouter');
const lessonRouter = require('./lesson');                    // для учителя: GET /lesson, POST /lesson, DELETE /lesson
const lessonStudentRouter = require('./lessonStudent');      // для студента: GET /lesson/student

router.use('/user', userRouter);
router.use('/teacher-anketa', teacherAnketaRouter);
router.use('/application', applicationRouter);
router.use('/work-availability', workAvailabilityRouter);
router.use('/weekly-schedule', weeklyWorkScheduleRouter);

// Подключаем оба роута к одному префиксу
router.use('/lesson', lessonRouter);         // /api/lesson — для учителя
router.use('/lesson', lessonStudentRouter);  // /api/lesson/student — для студента

module.exports = router;