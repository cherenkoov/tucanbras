// controllers/lessonController.js
const { Lesson, User, WorkAvailability } = require('../models/index');
const ApiError = require('../error/ApiError');

class LessonController {
  async getAll(req, res, next) {
    try {
      const teacherId = req.user.id;
      const lessons = await Lesson.findAll({
        where: { teacherId },
        include: [{
          model: User,
          as: 'Student',
          attributes: [
            'id',
            'fullName',
            'userName',        // ← добавлено
            'avatar',
            'level',           // ← добавлено
            'purpose',         // ← добавлено (JSON массив)
            'preferredTime'    // ← добавлено
          ]
        }],
        order: [['date', 'ASC'], ['hour', 'ASC']]
      });
      return res.json(lessons);
    } catch (e) {
      console.error('Ошибка getAll lessons:', e);
      next(ApiError.internal(e.message));
    }
  }

  async create(req, res, next) {
    try {
      const { date, hour, studentId } = req.body;
      const teacherId = req.user.id;

      if (!date || hour === undefined || !studentId) {
        return next(ApiError.badRequest('Некорректные данные: date, hour, studentId обязательны'));
      }

      const workSlot = await WorkAvailability.findOne({
        where: { userId: teacherId, date, hour }
      });

      if (!workSlot) {
        return next(ApiError.badRequest('Нет рабочего слота на выбранное время'));
      }

      const [lesson, created] = await Lesson.upsert(
        { teacherId, studentId, date, hour },
        { returning: true }
      );

      const fullLesson = await Lesson.findByPk(lesson.id, {
        include: [{
          model: User,
          as: 'Student',
          attributes: [
            'id',
            'fullName',
            'userName',
            'avatar',
            'level',
            'purpose',
            'preferredTime'
          ]
        }]
      });

      return res.json({ lesson: fullLesson, created });
    } catch (e) {
      console.error('Ошибка создания занятия:', e);
      next(ApiError.internal(e.message));
    }
  }

  async getForStudent(req, res, next) {
    try {
      const studentId = req.user.id;

      const lessons = await Lesson.findAll({
        where: { studentId },
        include: [{
          model: User,
          as: 'Teacher',
          attributes: ['id', 'fullName', 'avatar']
        }],
        order: [['date', 'ASC'], ['hour', 'ASC']]
      });

      return res.json(lessons);
    } catch (e) {
      console.error('Ошибка getForStudent lessons:', e);
      next(ApiError.internal(e.message));
    }
  }

  async remove(req, res, next) {
    try {
      const { date, hour } = req.body;
      const teacherId = req.user.id;

      if (!date || hour === undefined) {
        return next(ApiError.badRequest('Некорректные данные: date и hour обязательны'));
      }

      const deletedCount = await Lesson.destroy({
        where: { teacherId, date, hour }
      });

      return res.json({ success: true, deleted: deletedCount > 0 });
    } catch (e) {
      console.error('Ошибка удаления занятия:', e);
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new LessonController();