const ApiError = require('../error/ApiError');
const { TeacherAnketa, User, WeeklyWorkSchedule, Application } = require('../models/index');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { createTeacherPage, updateTeacherPage } = require('../services/notionTeacherService');

// Функция уведомления в Telegram — ОБЯЗАТЕЛЬНО ДО класса!
const sendTgAnketaNotify = async (anketa, user, imagePath, action = 'создал', updatedFields = {}) => {
  const groupChatId = process.env.SUPPORT_GROUP_ID;
  const botToken = process.env.BOT_TOKEN;
  if (!groupChatId || !botToken || !user) return;

  try {
    const notifyBot = new TelegramBot(botToken, { polling: false });
    const languagesText = anketa.languages?.length
      ? anketa.languages.map(l => `${l.flag || ''} ${l.name || l}`).join(', ')
      : 'Не указаны';
    const specializationsText = anketa.specializations?.length
      ? anketa.specializations.join(', ')
      : 'Не указаны';
    const interestsText = anketa.interests?.length
      ? anketa.interests.join(', ')
      : 'Не указаны';
    const levelsText = anketa.levels?.length
      ? anketa.levels.join('-')
      : 'Не указаны';
    const contactsText = anketa.contacts?.length
      ? anketa.contacts.map(c => {
          const icons = {
            telegram: 'Telegram',
            zoom: 'Zoom',
            whatsapp: 'WhatsApp',
            skype: 'Skype',
            email: 'Email'
          };
          return `${icons[c.type] || c.type}: ${c.value}`;
        }).join('\n')
      : 'Не указаны';

    const fullNameEmoji = updatedFields.fullName ? '❗' : '';
    const languagesEmoji = updatedFields.languages ? '❗' : '';
    const quoteEmoji = updatedFields.quote ? '❗' : '';
    const specializationsEmoji = updatedFields.specializations ? '❗' : '';
    const interestsEmoji = updatedFields.interests ? '❗' : '';
    const experienceEmoji = updatedFields.experience ? '❗' : '';
    const levelsEmoji = updatedFields.levels ? '❗' : '';
    const contactsEmoji = updatedFields.contacts ? '❗' : '';

    const userInfoText = `Учитель ${action} анкету!
Username: ${user.userName || 'Не указан'}
Gmail: ${user.gmail || 'Не указан'}
Phone: ${user.phoneNumber || 'Не указан'}
Telegram ID: ${user.telegramId || 'N/A'}
User ID: ${user.id}
Детали анкеты:
ФИО: ${fullNameEmoji} ${anketa.fullName || 'Не указано'}
Языки: ${languagesEmoji} ${languagesText}
Специализации: ${specializationsEmoji} ${specializationsText}
Интересы: ${interestsEmoji} ${interestsText}
Уровни: ${levelsEmoji} ${levelsText}
Опыт: ${experienceEmoji} ${anketa.experience ?? 'Не указан'} лет
Цитата: ${quoteEmoji} ${anketa.quote || 'Не указана'}
Способы связи: ${contactsEmoji}
${contactsText}
Фото: ${imagePath ? 'Да' : 'Нет'}
Дата: ${new Date().toLocaleString('ru-RU', { timeZone: 'America/Sao_Paulo' })}`;

    if (imagePath) {
      const imageLocalPath = path.resolve(__dirname, '..', 'static', imagePath);
      if (fs.existsSync(imageLocalPath)) {
        await notifyBot.sendPhoto(groupChatId, imageLocalPath, { caption: userInfoText, parse_mode: 'HTML' });
      } else {
        await notifyBot.sendMessage(groupChatId, userInfoText, { parse_mode: 'HTML' });
      }
    } else {
      await notifyBot.sendMessage(groupChatId, userInfoText, { parse_mode: 'HTML' });
    }
    console.log('TG уведомление отправлено');
  } catch (tgError) {
    console.error('TG уведомление ошибка:', tgError.message);
  }
};

class TeacherAnketaController {
  async create(req, res, next) {
    try {
      const { fullName, languages, quote, specializations, interests, experience, levels, contacts } = req.body;
      const { id: userId } = req.user;

      const existing = await TeacherAnketa.findOne({ where: { userId } });
      if (existing) return next(ApiError.badRequest('Анкета уже создана'));

      let imagePath = null;
      if (req.files && req.files.image) {
        const fileName = `anketa_${userId}_${uuid.v4()}.jpg`;
        await req.files.image.mv(path.resolve(__dirname, '..', 'static', fileName));
        imagePath = fileName;
      }

      const anketa = await TeacherAnketa.create({
        userId,
        fullName,
        languages: languages ? JSON.parse(languages) : null,
        quote,
        specializations: specializations ? JSON.parse(specializations) : null,
        interests: interests ? JSON.parse(interests) : null,
        experience: experience ? parseInt(experience) : null,
        levels: levels ? JSON.parse(levels) : null,
        contacts: contacts ? JSON.parse(contacts) : [],
        image: imagePath
      });

      const user = await User.findByPk(userId);
      await sendTgAnketaNotify(anketa, user, imagePath, 'создал');

      // Пишем в Notion (не блокируем ответ при ошибке)
      try {
        const notionPageId = await createTeacherPage({
          fullName: anketa.fullName,
          languages: anketa.languages,
          quote: anketa.quote,
          specializations: anketa.specializations,
          interests: anketa.interests,
          experience: anketa.experience,
          contacts: anketa.contacts,
        });
        await anketa.update({ notionPageId });
      } catch (notionErr) {
        console.error('Notion create error (non-blocking):', notionErr.message);
      }

      return res.json({
        anketa: {
          ...anketa.toJSON(),
          image: imagePath ? `/static/${imagePath}` : null
        }
      });
    } catch (e) {
      console.error('Create error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async getOne(req, res, next) {
    try {
      const { id: userId } = req.user;
      let anketa = await TeacherAnketa.findOne({ where: { userId } });
      if (!anketa) return next(ApiError.badRequest('Анкета не найдена'));

      return res.json({
        anketa: {
          ...anketa.toJSON(),
          image: anketa.image ? `/static/${anketa.image}` : null
        }
      });
    } catch (e) {
      console.error('GetOne error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async update(req, res, next) {
    try {
      const { id: userId } = req.user;
      const { fullName, languages, quote, specializations, interests, experience, levels, contacts } = req.body;

      let anketa = await TeacherAnketa.findOne({ where: { userId } });
      const updatedFields = {};

      if (!anketa) {
        let imagePath = null;
        if (req.files && req.files.image) {
          const fileName = `anketa_${userId}_${uuid.v4()}.jpg`;
          await req.files.image.mv(path.resolve(__dirname, '..', 'static', fileName));
          imagePath = fileName;
        }

        anketa = await TeacherAnketa.create({
          userId,
          fullName,
          languages: languages ? JSON.parse(languages) : null,
          quote,
          specializations: specializations ? JSON.parse(specializations) : null,
          interests: interests ? JSON.parse(interests) : null,
          experience: experience ? parseInt(experience) : null,
          levels: levels ? JSON.parse(levels) : null,
          contacts: contacts ? JSON.parse(contacts) : [],
          image: imagePath
        });

        const user = await User.findByPk(userId);
        await sendTgAnketaNotify(anketa, user, imagePath, 'создал');
      } else {
        if (fullName !== undefined && fullName !== anketa.fullName) {
          updatedFields.fullName = true;
          anketa.fullName = fullName;
        }
        if (languages !== undefined) {
          const parsed = languages ? JSON.parse(languages) : anketa.languages;
          if (JSON.stringify(parsed) !== JSON.stringify(anketa.languages || [])) updatedFields.languages = true;
          anketa.languages = parsed;
        }
        if (quote !== undefined && quote !== anketa.quote) {
          updatedFields.quote = true;
          anketa.quote = quote;
        }
        if (specializations !== undefined) {
          const parsed = specializations ? JSON.parse(specializations) : anketa.specializations;
          if (JSON.stringify(parsed) !== JSON.stringify(anketa.specializations || [])) updatedFields.specializations = true;
          anketa.specializations = parsed;
        }
        if (interests !== undefined) {
          const parsed = interests ? JSON.parse(interests) : anketa.interests;
          if (JSON.stringify(parsed) !== JSON.stringify(anketa.interests || [])) updatedFields.interests = true;
          anketa.interests = parsed;
        }
        if (experience !== undefined) {
          const newExp = experience ? parseInt(experience) : null;
          if (newExp !== anketa.experience) updatedFields.experience = true;
          anketa.experience = newExp;
        }
        if (levels !== undefined) {
          const parsed = levels ? JSON.parse(levels) : anketa.levels;
          if (JSON.stringify(parsed) !== JSON.stringify(anketa.levels || [])) updatedFields.levels = true;
          anketa.levels = parsed;
        }
        if (contacts !== undefined) {
          const parsed = contacts ? JSON.parse(contacts) : anketa.contacts || [];
          if (JSON.stringify(parsed) !== JSON.stringify(anketa.contacts || [])) updatedFields.contacts = true;
          anketa.contacts = parsed;
        }

        await anketa.save();
        // Обновляем Notion (non-blocking)
        try {
          if (anketa.notionPageId) {
            await updateTeacherPage(anketa.notionPageId, {
              fullName: anketa.fullName,
              languages: anketa.languages,
              quote: anketa.quote,
              specializations: anketa.specializations,
              interests: anketa.interests,
              experience: anketa.experience,
              contacts: anketa.contacts,
            });
          }
        } catch (notionErr) {
          console.error('Notion update error (non-blocking):', notionErr.message);
        }
        const user = await User.findByPk(userId);
        await sendTgAnketaNotify(anketa, user, anketa.image, 'обновил', updatedFields);
      }

      return res.json({
        anketa: {
          ...anketa.toJSON(),
          image: anketa.image ? `/static/${anketa.image}` : null
        }
      });
    } catch (e) {
      console.error('Update error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async updateImage(req, res, next) {
    try {
      const { id: userId } = req.user;
      let anketa = await TeacherAnketa.findOne({ where: { userId } });
      if (!anketa) return next(ApiError.badRequest('Анкета не найдена'));

      if (req.files && req.files.image) {
        if (anketa.image) {
          const oldPath = path.resolve(__dirname, '..', 'static', anketa.image);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const fileName = `anketa_${userId}_${uuid.v4()}.jpg`;
        await req.files.image.mv(path.resolve(__dirname, '..', 'static', fileName));
        anketa.image = fileName;
        await anketa.save();

        const user = await User.findByPk(userId);
        await sendTgAnketaNotify(anketa, user, fileName, 'обновил (изображение)');

        return res.json({ image: `/static/${fileName}` });
      } else {
        return next(ApiError.badRequest('Файл изображения не предоставлен'));
      }
    } catch (e) {
      console.error('UpdateImage error:', e);
      next(ApiError.internal(e.message));
    }
  }

  // Публичный список анкет с расписанием
  async publicGetAll(req, res, next) {
    try {
      const ankets = await TeacherAnketa.findAll({
        include: [{
          model: User,
          attributes: ['id', 'userName', 'telegramId']
        }]
      });

      const formatted = await Promise.all(
        ankets.map(async (a) => {
          let schedule = {};
          try {
            const record = await WeeklyWorkSchedule.findOne({ where: { userId: a.userId } });
            schedule = record ? record.schedule : {};
          } catch (err) {
            console.warn('Не удалось загрузить расписание для userId:', a.userId, err);
            schedule = {};
          }

          return {
            ...a.toJSON(),
            image: a.image ? `${req.protocol}://${req.get('host')}/static/${a.image}` : null,
            weeklySchedule: schedule
          };
        })
      );

      return res.json({ ankets: formatted });
    } catch (e) {
      console.error('PublicGetAll error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async getAll(req, res, next) {
    try {
      const ankets = await TeacherAnketa.findAll({
        include: [{ model: User, attributes: ['id', 'userName', 'role', 'telegramId', 'gmail'] }]
      });

      const formatted = ankets.map(a => ({
        ...a.toJSON(),
        image: a.image ? `/static/${a.image}` : null
      }));

      return res.json({ ankets: formatted });
    } catch (e) {
      console.error('GetAll error:', e);
      next(ApiError.internal(e.message));
    }
  }


  async getForStudent(req, res, next) {
  try {
    const { teacherId } = req.params;
    const studentId = req.user.id;

    // Проверяем одобренную заявку
    const application = await Application.findOne({
      where: {
        studentId,
        teacherId,
        status: 'approved'
      }
    });

    if (!application) {
      return next(ApiError.forbidden('У вас нет одобренной заявки к этому преподавателю'));
    }

    // Загружаем анкету преподавателя
    const anketa = await TeacherAnketa.findOne({
      where: { userId: teacherId },
      include: [{
        model: User,
        attributes: ['id', 'userName', 'fullName']
      }]
    });

    if (!anketa) {
      return next(ApiError.notFound('Анкета преподавателя не найдена'));
    }

    // ← ГЛАВНОЕ ДОБАВЛЕНИЕ: загружаем расписание!
    let weeklySchedule = {};
    try {
      const scheduleRecord = await WeeklyWorkSchedule.findOne({
        where: { userId: teacherId }
      });
      if (scheduleRecord && scheduleRecord.schedule) {
        weeklySchedule = scheduleRecord.schedule;
      }
    } catch (err) {
      console.warn('Не удалось загрузить расписание для преподавателя:', teacherId, err);
    }

    // Возвращаем анкету + расписание + фото
    return res.json({
      anketa: {
        ...anketa.toJSON(),
        image: anketa.image ? `${req.protocol}://${req.get('host')}/static/${anketa.image}` : null,
        weeklySchedule // ← теперь слоты будут отображаться!
      }
    });
  } catch (e) {
    console.error('Ошибка в getForStudent:', e);
    next(ApiError.internal(e.message));
  }
  }

  async adminUpdate(req, res, next) {
    try {
      const { id } = req.params;
      const anketa = await TeacherAnketa.findByPk(id, { include: User });
      if (!anketa) return next(ApiError.badRequest('Анкета не найдена'));

      const { fullName, languages, quote, specializations, interests, experience, levels, contacts } = req.body;
      const updatedFields = {};

      if (fullName !== undefined && fullName !== anketa.fullName) {
        updatedFields.fullName = true;
        anketa.fullName = fullName;
      }
      if (languages !== undefined) {
        const parsed = languages ? JSON.parse(languages) : anketa.languages;
        if (JSON.stringify(parsed) !== JSON.stringify(anketa.languages || [])) updatedFields.languages = true;
        anketa.languages = parsed;
      }
      if (quote !== undefined && quote !== anketa.quote) {
        updatedFields.quote = true;
        anketa.quote = quote;
      }
      if (specializations !== undefined) {
        const parsed = specializations ? JSON.parse(specializations) : anketa.specializations;
        if (JSON.stringify(parsed) !== JSON.stringify(anketa.specializations || [])) updatedFields.specializations = true;
        anketa.specializations = parsed;
      }
      if (interests !== undefined) {
        const parsed = interests ? JSON.parse(interests) : anketa.interests;
        if (JSON.stringify(parsed) !== JSON.stringify(anketa.interests || [])) updatedFields.interests = true;
        anketa.interests = parsed;
      }
      if (experience !== undefined) {
        const newExp = experience ? parseInt(experience) : null;
        if (newExp !== anketa.experience) updatedFields.experience = true;
        anketa.experience = newExp;
      }
      if (levels !== undefined) {
        const parsed = levels ? JSON.parse(levels) : anketa.levels;
        if (JSON.stringify(parsed) !== JSON.stringify(anketa.levels || [])) updatedFields.levels = true;
        anketa.levels = parsed;
      }
      if (contacts !== undefined) {
        const parsed = contacts ? JSON.parse(contacts) : anketa.contacts || [];
        if (JSON.stringify(parsed) !== JSON.stringify(anketa.contacts || [])) updatedFields.contacts = true;
        anketa.contacts = parsed;
      }

      let imageChanged = false;
      if (req.files && req.files.image) {
        imageChanged = true;
        if (anketa.image) {
          const oldPath = path.resolve(__dirname, '..', 'static', anketa.image);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const fileName = `anketa_${anketa.userId}_${uuid.v4()}.jpg`;
        await req.files.image.mv(path.resolve(__dirname, '..', 'static', fileName));
        anketa.image = fileName;
      }

      await anketa.save();

      // Обновляем Notion (non-blocking)
      try {
        if (anketa.notionPageId) {
          await updateTeacherPage(anketa.notionPageId, {
            fullName: anketa.fullName,
            languages: anketa.languages,
            quote: anketa.quote,
            specializations: anketa.specializations,
            interests: anketa.interests,
            experience: anketa.experience,
            contacts: anketa.contacts,
          });
        }
      } catch (notionErr) {
        console.error('Notion adminUpdate error (non-blocking):', notionErr.message);
      }

      const user = anketa.User || await User.findByPk(anketa.userId);
      const adminInfo = ` (админ: ${req.user.userName || req.user.id})`;

      if (Object.keys(updatedFields).length > 0 || imageChanged) {
        await sendTgAnketaNotify(anketa, user, anketa.image, 'обновил' + adminInfo, updatedFields);
      }

      return res.json({
        anketa: {
          ...anketa.toJSON(),
          image: anketa.image ? `/static/${anketa.image}` : null
        }
      });
    } catch (e) {
      console.error('adminUpdate error:', e);
      next(ApiError.internal('Ошибка обновления анкеты: ' + e.message));
    }
  }
}

module.exports = new TeacherAnketaController();