const { WorkAvailability, User } = require('../models/index');
const ApiError = require('../error/ApiError');

class WorkAvailabilityController {
  async getAll(req, res, next) {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      let slots;

      if (currentUserRole === 'ADMIN' || currentUserRole === 'OWNER') {
        // Админ видит все слоты всех пользователей + имя и аватар
        slots = await WorkAvailability.findAll({
          include: [{
            model: User,
            attributes: ['id', 'fullName', 'avatar'], // ← ИСПРАВЛЕНО: fullName вместо name
          }],
          order: [['date', 'ASC'], ['hour', 'ASC']],
        });
      } else {
        // Учитель видит только свои слоты + своё имя и аватар
        slots = await WorkAvailability.findAll({
          where: { userId: currentUserId },
          include: [{
            model: User,
            attributes: ['id', 'fullName', 'avatar'], // ← ТО ЖЕ ИСПРАВЛЕНИЕ
          }],
          order: [['date', 'ASC'], ['hour', 'ASC']],
        });
      }

      return res.json(slots);
    } catch (e) {
      console.error('Ошибка в workAvailability getAll:', e);
      next(ApiError.internal(e.message));
    }
  }

  async create(req, res, next) {
    try {
      const { date, hour } = req.body;
      const userId = req.user.id;

      if (!date || hour === undefined || hour < 0 || hour > 23) {
        return next(ApiError.badRequest('Некорректные данные'));
      }

      const [slot, created] = await WorkAvailability.upsert(
        { userId, date, hour },
        { returning: true }
      );

      return res.json({ slot, created });
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }

  async remove(req, res, next) {
    try {
      const { date, hour } = req.body;
      const userId = req.user.id;

      if (!date || hour === undefined) {
        return next(ApiError.badRequest('Некорректные данные'));
      }

      const deleted = await WorkAvailability.destroy({
        where: { userId, date, hour },
      });

      return res.json({ deleted: !!deleted });
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }

  async bulkRemove(req, res, next) {
    try {
      const userId = req.user.id;
      const { dates } = req.body;

      if (!Array.isArray(dates) || dates.length === 0) {
        return next(ApiError.badRequest('Некорректные данные: ожидается массив дат'));
      }

      const deletedCount = await WorkAvailability.destroy({
        where: {
          userId,
          date: dates,
        },
      });

      return res.json({ success: true, deletedCount });
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new WorkAvailabilityController();