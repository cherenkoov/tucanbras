// controllers/applicationController.js
const ApiError = require('../error/ApiError');
const { Application, User } = require('../models/index');
const TelegramBot = require('node-telegram-bot-api');

class ApplicationController {
  async create(req, res, next) {
    try {
      const { teacherId } = req.body;
      const studentId = req.user.id;

      if (!teacherId) return next(ApiError.badRequest('teacherId обязателен'));

      const existing = await Application.findOne({
        where: { studentId, teacherId, status: 'pending' }
      });
      if (existing) {
        return next(ApiError.badRequest('Заявка уже отправлена и ожидает рассмотрения'));
      }

      const application = await Application.create({
        studentId,
        teacherId,
        status: 'pending'
      });

      console.log('✅ Заявка создана:', application.id, 'от студента', studentId, 'учителю', teacherId);

      // Уведомление учителю в TG
      const teacher = await User.findByPk(teacherId);
      if (teacher && teacher.telegramId) {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
          console.warn('⚠️ BOT_TOKEN не найден в .env — уведомление не отправлено');
        } else {
          const student = await User.findByPk(studentId);
          if (!student) {
            console.error('❌ Студент не найден по ID:', studentId);
            return next(ApiError.internal('Студент не найден'));
          }

          const notifyBot = new TelegramBot(botToken, { polling: false });
          const message = `🔔 Новая заявка от студента!\n👤 Студент: ${student.fullName || 'Не указано'} (@${student.userName || 'N/A'})\n📧 ${student.gmail || 'Не указан'}\n📱 ${student.phoneNumber || 'Не указан'}\n🔗 Просмотреть профиль: /profile/${studentId}\n\n(Заявка ID: ${application.id})`;

          try {
            await notifyBot.sendMessage(teacher.telegramId, message, { parse_mode: 'HTML' });
            console.log('✅ TG уведомление отправлено учителю:', teacherId, 'chatId:', teacher.telegramId);
          } catch (tgError) {
            console.error('❌ Ошибка отправки TG уведомления учителю:', tgError.message, 'chatId:', teacher.telegramId);
          }
        }
      } else {
        console.log('⚠️ У учителя', teacherId, 'нет telegramId — уведомление пропущено');
      }

      return res.json({
        message: 'Заявка отправлена',
        application: { id: application.id, status: application.status }
      });
    } catch (e) {
      console.error('❌ Create application error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async getTeacherApplications(req, res, next) {
    try {
      const teacherId = req.user.id;
      const applications = await Application.findAll({
        where: { teacherId },
        include: [{
          model: User,
          as: 'Student',
          attributes: [
            'id',
            'fullName',
            'userName',
            'gmail',
            'avatar',
            'level',         // есть
            'purpose',       // есть (JSON)
            'preferredTime'  // есть
            // 'comment' — УБРАНО, потому что его нет в таблице User
          ]
        }],
        order: [['submittedAt', 'DESC']]
      });
      console.log('✅ Загружено заявок для учителя:', applications.length);
      return res.json({ applications });
    } catch (e) {
      console.error('❌ Get teacher applications error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async getStatus(req, res, next) {
    try {
      const { teacherId } = req.params;
      const studentId = req.user.id;
      const app = await Application.findOne({
        where: { studentId, teacherId }
      });
      console.log('✅ Статус заявки:', app ? app.status : 'null', 'для', studentId, '-', teacherId);
      return res.json({ status: app ? app.status : null });
    } catch (e) {
      console.error('❌ Get status error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async getStudentStatus(req, res, next) {
    try {
      const studentId = req.user.id;
      const application = await Application.findOne({
        where: { studentId },
        include: [{ model: User, as: 'Teacher', attributes: ['id'] }],
        order: [['submittedAt', 'DESC']]
      });
      console.log('✅ Статус последней заявки студента:', application ? application.status : 'null');
      return res.json({
        application: application ? {
          status: application.status,
          teacherId: application.teacherId
        } : null
      });
    } catch (e) {
      console.error('❌ Get student status error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { action } = req.params;
      const teacherId = req.user.id;

      if (!['approve', 'reject'].includes(action)) {
        return next(ApiError.badRequest('Неверное действие'));
      }

      const application = await Application.findOne({
        where: { id, teacherId }
      });
      if (!application) {
        return next(ApiError.badRequest('Заявка не найдена'));
      }
      if (application.status !== 'pending') {
        return next(ApiError.badRequest('Заявка уже обработана'));
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await application.update({ status: newStatus });

      console.log('✅ Статус заявки обновлён:', newStatus, 'ID:', id);

      // Уведомление студенту в TG
      const student = await User.findByPk(application.studentId);
      if (student && student.telegramId) {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
          console.warn('⚠️ BOT_TOKEN не найден — уведомление студенту пропущено');
        } else {
          const notifyBot = new TelegramBot(botToken, { polling: false });
          const statusText = newStatus === 'approved' ? '✅ Ваша заявка одобрена!' : '❌ Ваша заявка отклонена.';
          const message = `${statusText}\n👤 Преподаватель: ${req.user.fullName || 'Не указано'}\n📅 Дата: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n🔗 Ваш профиль: /profile/${application.studentId}`;

          try {
            await notifyBot.sendMessage(student.telegramId, message, { parse_mode: 'HTML' });
            console.log('✅ TG уведомление отправлено студенту:', application.studentId, 'chatId:', student.telegramId);
          } catch (tgError) {
            console.error('❌ Ошибка отправки TG уведомления студенту:', tgError.message, 'chatId:', student.telegramId);
          }
        }
      } else {
        console.log('⚠️ У студента', application.studentId, 'нет telegramId — уведомление пропущено');
      }

      return res.json({
        message: `Заявка ${newStatus === 'approved' ? 'одобрена' : 'отклонена'}`,
        status: newStatus
      });
    } catch (e) {
      console.error('❌ Update application status error:', e);
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new ApplicationController();