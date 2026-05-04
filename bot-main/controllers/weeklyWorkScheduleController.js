// controllers/weeklyWorkScheduleController.js
const { WeeklyWorkSchedule } = require('../models/index');
const ApiError = require('../error/ApiError');
const { updateScheduleInNotion } = require('../services/notionTeacherService');
const { TeacherAnketa } = require('../models/index');

class WeeklyWorkScheduleController {
  async get(req, res, next) {
    try {
      const requestedUserId = req.query.userId ? parseInt(req.query.userId, 10) : null;
      const currentUser = req.user;

      let targetUserId;

      // 1. Если запрашивают конкретного пользователя по userId
      if (requestedUserId && !isNaN(requestedUserId)) {
        // Разрешаем ВСЕМ авторизованным пользователям (включая USER) просматривать расписание любого
        targetUserId = requestedUserId;
      } else {
        // 2. Если userId не передан — показываем расписание текущего пользователя
        // (например, когда учитель смотрит/редактирует своё)
        targetUserId = currentUser.id;
      }

      const record = await WeeklyWorkSchedule.findOne({
        where: { userId: targetUserId }
      });

      // Если расписания нет — возвращаем пустой объект, а не ошибку
      return res.json({ schedule: record ? record.schedule : {} });
    } catch (e) {
      console.error('Ошибка получения недельного расписания:', e);
      next(ApiError.internal('Ошибка сервера при загрузке расписания'));
    }
  }

  async save(req, res, next) {
    try {
      const userId = req.user.id;
      const { schedule } = req.body;

      if (!schedule || typeof schedule !== 'object') {
        return next(ApiError.badRequest('Некорректный формат расписания'));
      }

      const [record, created] = await WeeklyWorkSchedule.upsert(
        { userId, schedule },
        { returning: true }
      );

      // Обновляем расписание в Notion (только для просмотра, non-blocking)
      try {
        const anketa = await TeacherAnketa.findOne({ where: { userId } });
        if (anketa?.notionPageId) {
          await updateScheduleInNotion(anketa.notionPageId, schedule);
        }
      } catch (notionErr) {
        console.error('Notion schedule update error (non-blocking):', notionErr.message);
      }

      return res.json({ success: true, created: !!created });
    } catch (e) {
      console.error('Ошибка сохранения расписания:', e);
      next(ApiError.internal('Ошибка сохранения расписания'));
    }
  }
}

module.exports = new WeeklyWorkScheduleController();