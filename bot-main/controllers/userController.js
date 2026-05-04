const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, TeacherAnketa } = require('../models/index');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const TelegramBot = require('node-telegram-bot-api');
const { validateTelegramInitData } = require('../utils/telegramAuth'); // ← новый импорт

const levelMap = { beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый' };
const purposeMap = { learn: 'Изучить', practice: 'Практика', teach: 'Обучить' };
const timeMap = { morning: 'Утро', evening: 'Вечер', weekend: 'Выходные' };

const generateJwt = (id, userName, role, avatar, gmail, fullName, timezone, hasCompletedOnboarding) => {
  return jwt.sign(
      { id, userName, role, avatar, gmail, fullName, timezone, hasCompletedOnboarding },
      process.env.SECRET_KEY,
      { expiresIn: '24h' }
  );
};

const saveAvatar = async (buffer, userId, originalMime = 'image/jpeg') => {
  const timestamp = Date.now();
  let ext = 'jpg';

  let sharpInstance = sharp(buffer, { animated: true });

  if (originalMime === 'image/gif') {
    ext = 'gif';
    sharpInstance = sharpInstance.gif({});
  } else if (originalMime === 'image/png') {
    ext = 'png';
    sharpInstance = sharpInstance.png({ quality: 90 });
  } else if (originalMime === 'image/webp') {
    ext = 'webp';
    sharpInstance = sharpInstance.webp({ quality: 80 });
  } else {
    ext = 'jpg';
    sharpInstance = sharpInstance.jpeg({ quality: 80 });
  }

  const fileName = `avatar_${userId}_${timestamp}.${ext}`;
  const filePath = path.resolve(__dirname, '..', 'static', fileName);

  await sharpInstance
      .resize(320, 320, { fit: 'cover', withoutEnlargement: true })
      .toFile(filePath);

  return fileName;
};

class UserController {
  async registration(req, res, next) {
    const {
      fullName,
      gmail,
      userName,
      password,
      role,
      telegramId,
      photoUrl,
      timezone,
      onboardingAnswers,
      initData   // ← от Telegram WebApp
    } = req.body;

    console.log('📥 Registration attempt:', {
      fullName,
      gmail,
      userName: userName?.trim(),
      telegramId,
      hasInitData: !!initData,
      hasOnboarding: !!onboardingAnswers
    });

    // ====================== TELEGRAM MINI APP РЕЖИМ ======================
    if (initData) {
      try {
        if (!validateTelegramInitData(initData, process.env.BOT_TOKEN)) {
          return next(ApiError.badRequest('Неверная подпись данных Telegram'));
        }

        const initDataUnsafe = JSON.parse(decodeURIComponent(initData));
        const tgUser = initDataUnsafe.user;

        if (!tgUser || !tgUser.id) {
          return next(ApiError.badRequest('Не удалось получить данные пользователя из Telegram'));
        }

        console.log('✅ Валидный initData от Telegram. Telegram ID:', tgUser.id);

        // Проверяем, существует ли пользователь
        let existingUser = await User.findOne({ where: { telegramId: tgUser.id } });

        if (existingUser) {
          console.log('Пользователь уже существует → авто-логин');
          const token = generateJwt(
              existingUser.id,
              existingUser.userName,
              existingUser.role,
              existingUser.avatar,
              existingUser.gmail,
              existingUser.fullName,
              existingUser.timezone,
              existingUser.hasCompletedOnboarding
          );

          return res.json({
            token,
            user: { ...existingUser.toJSON(), avatar: existingUser.avatar || null },
            message: 'Авторизация через Telegram'
          });
        }

        // Создаём нового пользователя
        const finalFullName = fullName || `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Пользователь';
        const finalUserName = userName || `tg_${tgUser.id}`;

        const hashPassword = await bcrypt.hash(`Tg_${tgUser.id}_${Date.now()}`, 10);

        const user = await User.create({
          telegramId: tgUser.id,
          fullName: finalFullName,
          gmail: gmail || `${tgUser.id}@tucanbras.app`,
          userName: finalUserName,
          password: hashPassword,
          timezone: timezone || 'UTC',
          role: role || 'USER',
          hasCompletedOnboarding: true,
          level: onboardingAnswers?.level || null,
          purpose: onboardingAnswers?.purpose || null,
          preferredTime: onboardingAnswers?.time || null,
        });

        console.log('✅ Новый пользователь создан через Telegram. ID:', user.id);

        // Скачиваем аватар Telegram
        let avatarPath = null;
        if (tgUser.photo_url || photoUrl) {
          try {
            const axios = require('axios');
            const avatarUrl = tgUser.photo_url || photoUrl;
            const response = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            const contentType = response.headers['content-type'] || 'image/jpeg';
            avatarPath = await saveAvatar(response.data, user.id, contentType);
            await user.update({ avatar: avatarPath });
            console.log('✅ Аватар Telegram сохранён:', avatarPath);
          } catch (downloadErr) {
            console.warn('Не удалось скачать аватар TG:', downloadErr.message);
          }
        }

        const token = generateJwt(
            user.id,
            user.userName,
            user.role,
            avatarPath,
            user.gmail,
            user.fullName,
            user.timezone,
            true
        );

        // Уведомление в группу поддержки
        const groupChatId = process.env.SUPPORT_GROUP_ID;
        if (groupChatId && process.env.BOT_TOKEN) {
          try {
            const notifyBot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
            const userInfoText = `Новый пользователь через Telegram!\n` +
                `Full Name: ${user.fullName}\n` +
                `Username: ${user.userName}\n` +
                `Gmail: ${user.gmail}\n` +
                `Telegram ID: ${user.telegramId}\n` +
                `Onboarding: Пройден`;
            await notifyBot.sendMessage(groupChatId, userInfoText);
          } catch (tgError) {
            console.error('Ошибка уведомления в группу:', tgError.message);
          }
        }

        return res.json({
          token,
          user: {
            id: user.id,
            fullName: user.fullName,
            userName: user.userName,
            role: user.role,
            hasCompletedOnboarding: true,
            avatar: avatarPath || null,
            gmail: user.gmail,
            timezone: user.timezone,
            createdAt: user.createdAt,
            level: user.level,
            purpose: user.purpose,
            preferredTime: user.preferredTime,
          }
        });

      } catch (tgError) {
        console.error('Telegram registration error:', tgError);
        return next(ApiError.internal('Ошибка регистрации через Telegram'));
      }
    }

    // ====================== ОБЫЧНАЯ РЕГИСТРАЦИЯ (email + пароль) ======================
    // Всё, что было у тебя раньше — полностью сохранено

    if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
      return next(ApiError.badRequest('Полное имя должно содержать 2-100 символов'));
    }
    if (!gmail || !/^[^\s@]+@[^\s@]+.[^\s@]+$/.test(gmail)) {
      return next(ApiError.badRequest('Некорректный формат gmail'));
    }
    if (!userName || userName.trim().length < 3) {
      return next(ApiError.badRequest('userName должен содержать минимум 3 символа'));
    }
    if (!timezone) {
      return next(ApiError.badRequest('Часовой пояс обязателен'));
    }
    if (!password || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
      return next(ApiError.badRequest('Пароль должен содержать минимум 8 символов, включая буквы и цифры'));
    }

    const candidateByGmail = await User.findOne({ where: { gmail } });
    const candidateByUserName = await User.findOne({ where: { userName: userName.trim() } });
    if (candidateByGmail) {
      return next(ApiError.badRequest('Пользователь с таким gmail уже существует'));
    }
    if (candidateByUserName) {
      return next(ApiError.badRequest('Пользователь с таким userName уже существует'));
    }

    try {
      const trimmedUserName = userName.trim();
      console.log('Creating user with:', { fullName, gmail, userName: trimmedUserName, timezone });

      const hashPassword = await bcrypt.hash(password, 5);

      const user = await User.create({
        fullName: fullName.trim(),
        gmail,
        userName: trimmedUserName,
        password: hashPassword,
        timezone,
        role: role || 'USER',
        telegramId: telegramId || null,
        hasCompletedOnboarding: true,
        // Новые поля из онбординга
        level: onboardingAnswers?.level || null,
        purpose: onboardingAnswers?.purpose || null,
        preferredTime: onboardingAnswers?.time || null,
      });

      console.log('User created:', user.id, 'username:', user.userName, 'role:', user.role);

      let avatarPath = null;
      if (photoUrl) {
        try {
          console.log('Downloading TG avatar:', photoUrl);
          const axios = require('axios');
          const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
          const contentType = response.headers['content-type'] || 'image/jpeg';
          const buffer = response.data;

          avatarPath = await saveAvatar(buffer, user.id, contentType);
          await user.update({ avatar: avatarPath });
          console.log('TG avatar saved:', avatarPath);
        } catch (downloadErr) {
          console.error('Failed to download TG avatar:', downloadErr.message);
        }
      }

      const token = generateJwt(
          user.id,
          user.userName,
          user.role,
          avatarPath,
          user.gmail,
          user.fullName,
          user.timezone,
          user.hasCompletedOnboarding
      );

      const groupChatId = process.env.SUPPORT_GROUP_ID;
      if (groupChatId && process.env.BOT_TOKEN) {
        try {
          const notifyBot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });
          const onboardingText = onboardingAnswers ? `
Onboarding:
• Уровень: ${levelMap[onboardingAnswers.level] || onboardingAnswers.level || 'Не указан'}
• Цель: ${Array.isArray(onboardingAnswers.purpose) ? onboardingAnswers.purpose.map(p => purposeMap[p] || p).join(', ') : 'Не указана'}
• Время: ${timeMap[onboardingAnswers.time] || onboardingAnswers.time || 'Не указано'}` : '';

          const userInfoText = `Новый пользователь зарегистрировался!
Full Name: ${user.fullName || 'Не указан'}
Username: ${user.userName || 'Не указан'}
Gmail: ${user.gmail}
Timezone: ${user.timezone || 'Не указан'}
${onboardingText}
Role: ${user.role}
Telegram ID: ${user.telegramId || 'N/A'}
Avatar: ${avatarPath ? `Да (файл: ${avatarPath})` : 'Нет'}
Onboarding: Пройден
User ID (DB): ${user.id}`.trim();

          if (avatarPath) {
            const avatarLocalPath = path.resolve(__dirname, '..', 'static', avatarPath);
            if (fs.existsSync(avatarLocalPath)) {
              await notifyBot.sendPhoto(groupChatId, avatarLocalPath, { caption: userInfoText, parse_mode: 'HTML' });
            } else {
              await notifyBot.sendMessage(groupChatId, userInfoText, { parse_mode: 'HTML' });
            }
          } else {
            await notifyBot.sendMessage(groupChatId, userInfoText, { parse_mode: 'HTML' });
          }
        } catch (tgError) {
          console.error('Ошибка отправки в TG-группу:', tgError.message || tgError);
        }
      }

      return res.json({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          userName: user.userName,
          role: user.role,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          avatar: avatarPath || null,
          gmail: user.gmail,
          timezone: user.timezone,
          createdAt: user.createdAt,
          level: user.level,
          purpose: user.purpose,
          preferredTime: user.preferredTime,
        },
      });
    } catch (regError) {
      console.error('Registration internal error:', regError.message || regError);
      console.error('Stack:', regError.stack);
      return next(ApiError.internal('Ошибка создания пользователя'));
    }
  }

  async updateProfileJson(req, res, next) {
    try {
      console.log('PUT /profile (JSON) hit:', req.body);

      const { fullName, userName, timezone } = req.body;
      const userId = req.user.id;

      if (fullName !== undefined) {
        if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
          return next(ApiError.badRequest('Полное имя должно содержать 2-100 символов'));
        }
        if (!/^[a-zA-ZА-ЯЁа-яё\s]+$/u.test(fullName.trim())) {
          return next(ApiError.badRequest('Полное имя: только буквы и пробелы'));
        }
      }
      if (userName !== undefined) {
        if (!userName.trim() || userName.trim().length < 3) {
          return next(ApiError.badRequest('userName должен содержать минимум 3 символа'));
        }
        if (!/^[a-zA-Z0-9_]+$/.test(userName.trim())) {
          return next(ApiError.badRequest('userName: только буквы, цифры и _'));
        }
        const existing = await User.findOne({
          where: { userName: userName.trim(), id: { [Op.ne]: userId } }
        });
        if (existing) return next(ApiError.badRequest('Имя пользователя уже занято'));
      }
      if (timezone && !timezone) {
        return next(ApiError.badRequest('Часовой пояс обязателен'));
      }

      let user = await User.findByPk(userId);
      if (!user) return next(ApiError.badRequest('Пользователь не найден'));

      const updates = {};
      if (fullName !== undefined) updates.fullName = fullName.trim();
      if (userName !== undefined) updates.userName = userName.trim();
      if (timezone !== undefined) updates.timezone = timezone;

      if (Object.keys(updates).length > 0) {
        await user.update(updates);
        await user.reload();
      }

      const token = generateJwt(
          user.id,
          user.userName,
          user.role,
          user.avatar,
          user.gmail,
          user.fullName,
          user.timezone,
          user.hasCompletedOnboarding
      );

      return res.json({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          userName: user.userName,
          role: user.role,
          avatar: user.avatar || null,
          timezone: user.timezone,
          createdAt: user.createdAt,
          level: user.level,
          purpose: user.purpose,
          preferredTime: user.preferredTime,
        }
      });
    } catch (e) {
      console.error('updateProfileJson error:', e);
      next(ApiError.internal('Ошибка обновления профиля'));
    }
  }

  async updateAvatarHandler(req, res, next) {
    try {
      const { id } = req.user;
      const avatarFile = req.file;
      const { deleteAvatar } = req.body;

      let user = await User.findByPk(id);
      if (!user) return next(ApiError.badRequest('Пользователь не найден'));

      let newAvatar = user.avatar;

      if (deleteAvatar === 'true') {
        if (user.avatar) {
          const oldPath = path.resolve(__dirname, '..', 'static', user.avatar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        newAvatar = null;
        await user.update({ avatar: null });
      }

      if (avatarFile) {
        const mime = avatarFile.mimetype;
        if (!mime.startsWith('image/')) {
          return next(ApiError.badRequest('Файл должен быть изображением'));
        }

        newAvatar = await saveAvatar(avatarFile.buffer, id, mime);

        if (user.avatar) {
          const oldPath = path.resolve(__dirname, '..', 'static', user.avatar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await user.update({ avatar: newAvatar });
      }

      await user.reload();

      const token = generateJwt(
          user.id,
          user.userName,
          user.role,
          newAvatar,
          user.gmail,
          user.fullName,
          user.timezone,
          user.hasCompletedOnboarding
      );

      return res.json({
        token,
        avatar: newAvatar,
        user: {
          id: user.id,
          fullName: user.fullName,
          userName: user.userName,
          role: user.role,
          avatar: newAvatar || null,
          timezone: user.timezone,
          createdAt: user.createdAt,
          level: user.level,
          purpose: user.purpose,
          preferredTime: user.preferredTime,
        }
      });
    } catch (e) {
      console.error('updateAvatarHandler error:', e);
      next(ApiError.badRequest(e.message));
    }
  }

  async login(req, res, next) {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return next(ApiError.badRequest('Не указан идентификатор или пароль'));
    }
    console.log('Login attempt: identifier =', identifier, '(type:', identifier.includes('@') ? 'email' : 'username', ')');

    const trimmedIdentifier = identifier.trim();
    let user;
    try {
      user = await User.findOne({
        where: {
          [Op.or]: [
            { gmail: trimmedIdentifier },
            { userName: trimmedIdentifier }
          ],
        },
      });
    } catch (dbError) {
      console.error('Login DB query error:', dbError);
      return next(ApiError.internal('Ошибка поиска пользователя'));
    }

    if (!user) {
      return next(ApiError.badRequest('Пользователь не найден'));
    }

    const comparePassword = bcrypt.compareSync(password, user.password);
    if (!comparePassword) {
      console.log('Login: Wrong password for user', user.id);
      return next(ApiError.badRequest('Указан неверный пароль'));
    }

    const token = generateJwt(
        user.id,
        user.userName,
        user.role,
        user.avatar,
        user.gmail,
        user.fullName,
        user.timezone,
        user.hasCompletedOnboarding
    );

    console.log('Login SUCCESS for user:', user.id, 'onboarding:', user.hasCompletedOnboarding);

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        userName: user.userName,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        avatar: user.avatar || null,
        gmail: user.gmail,
        timezone: user.timezone,
        createdAt: user.createdAt,
        level: user.level,
        purpose: user.purpose,
        preferredTime: user.preferredTime,
      },
    });
  }

  async check(req, res, next) {
    const userId = req.user.id;
    console.log('Check auth for userId:', userId);

    let user;
    let anketa = null;

    try {
      user = await User.findByPk(userId);
      if (!user) {
        console.log('Check: User not found by ID', userId);
        return next(ApiError.badRequest('Пользователь не найден'));
      }

      if (user.role === 'TEACHER') {
        try {
          anketa = await TeacherAnketa.findOne({ where: { userId: user.id } });
          console.log('Anketa loaded in check:', anketa ? 'found' : 'null');
        } catch (anketaErr) {
          console.error('Error loading anketa in check:', anketaErr.message || anketaErr);
          anketa = null;
        }
      }

      console.log('Check found user:', { id: user.id, userName: user.userName, gmail: user.gmail, onboarding: user.hasCompletedOnboarding });
    } catch (dbError) {
      console.error('Check DB error (user load):', dbError);
      return next(ApiError.internal('Ошибка загрузки пользователя'));
    }

    const token = generateJwt(
        user.id,
        user.userName,
        user.role,
        user.avatar,
        user.gmail,
        user.fullName,
        user.timezone,
        user.hasCompletedOnboarding
    );

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        userName: user.userName,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        avatar: user.avatar || null,
        gmail: user.gmail,
        timezone: user.timezone,
        createdAt: user.createdAt,
        level: user.level,
        purpose: user.purpose,
        preferredTime: user.preferredTime,
      },
      anketa: anketa ? { ...anketa.toJSON(), image: anketa.image ? anketa.image : null } : null
    });
  }

  async checkUnique(req, res, next) {
    const { gmail, userName } = req.body;
    try {
      if (gmail) {
        const candidate = await User.findOne({ where: { gmail: gmail.trim() } });
        if (candidate) {
          return res.json({ exists: true, field: 'gmail' });
        }
      }
      if (userName) {
        const candidate = await User.findOne({ where: { userName: userName.trim() } });
        if (candidate) {
          return res.json({ exists: true, field: 'userName' });
        }
      }
      return res.json({ exists: false });
    } catch (e) {
      console.error('checkUnique error:', e);
      next(ApiError.badRequest(e.message));
    }
  }

  async updateAvatar(req, res, next) {
    console.log('=== POST /api/user/avatar HIT ===');
    console.log('req.user:', req.user);
    console.log('req.file:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'НЕТ ФАЙЛА');
    console.log('req.body:', req.body);

    try {
      const { id } = req.user;
      const file = req.file;
      const { fullName, userName, timezone, deleteAvatar } = req.body;

      const user = await User.findByPk(id);
      if (!user) return next(ApiError.badRequest('Пользователь не найден'));

      let newAvatarFilename = user.avatar;
      const updates = {};

      if (deleteAvatar === 'true') {
        if (user.avatar) {
          const oldPath = path.resolve(__dirname, '..', 'static', user.avatar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        newAvatarFilename = null;
        updates.avatar = null;
      }

      if (file) {
        const mime = file.mimetype;
        if (!mime.startsWith('image/')) {
          return next(ApiError.badRequest('Аватар должен быть изображением'));
        }

        newAvatarFilename = await saveAvatar(file.buffer, id, mime);

        if (user.avatar) {
          const oldPath = path.resolve(__dirname, '..', 'static', user.avatar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updates.avatar = newAvatarFilename;
      }

      if (fullName !== undefined) updates.fullName = fullName.trim();
      if (userName !== undefined) {
        const trimmed = userName.trim();
        if (await User.findOne({ where: { userName: trimmed, id: { [Op.ne]: id } } })) {
          return next(ApiError.badRequest('Имя пользователя уже занято'));
        }
        updates.userName = trimmed;
      }
      if (timezone !== undefined) updates.timezone = timezone;

      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }

      const freshUser = await User.findByPk(id);

      const token = generateJwt(
          freshUser.id,
          freshUser.userName,
          freshUser.role,
          freshUser.avatar,
          freshUser.gmail,
          freshUser.fullName,
          freshUser.timezone,
          freshUser.hasCompletedOnboarding
      );

      return res.json({
        token,
        user: {
          id: freshUser.id,
          fullName: freshUser.fullName,
          userName: freshUser.userName,
          role: freshUser.role,
          avatar: freshUser.avatar || null,
          timezone: freshUser.timezone,
          hasCompletedOnboarding: freshUser.hasCompletedOnboarding,
          createdAt: freshUser.createdAt,
          level: freshUser.level,
          purpose: freshUser.purpose,
          preferredTime: freshUser.preferredTime,
        },
      });
    } catch (e) {
      console.error('updateAvatar error:', e);
      next(ApiError.internal('Ошибка обновления профиля'));
    }
  }

  async updateProfile(req, res, next) {
    try {
      console.log('updateProfile: req.body:', req.body);
      console.log('updateProfile: req.file?', !!req.file, req.file ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'NO FILE');

      const { fullName, userName, timezone, deleteAvatar } = req.body;
      const userId = req.user.id;
      const avatarFile = req.file;

      if (fullName !== undefined) {
        if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
          return next(ApiError.badRequest('Полное имя должно содержать 2-100 символов'));
        }
        if (!/^[a-zA-ZА-ЯЁа-яё\s]+$/u.test(fullName.trim())) {
          return next(ApiError.badRequest('Полное имя: только буквы и пробелы'));
        }
      }
      if (userName !== undefined) {
        if (userName.trim().length < 3 || !userName.trim()) {
          return next(ApiError.badRequest('userName должен содержать минимум 3 символа'));
        }
        if (!/^[a-zA-Z0-9_]+$/.test(userName.trim())) {
          return next(ApiError.badRequest('userName: только буквы, цифры и _'));
        }
        const existingUser = await User.findOne({
          where: { userName: userName.trim(), id: { [Op.ne]: userId } }
        });
        if (existingUser) {
          return next(ApiError.badRequest('Имя пользователя уже занято'));
        }
      }
      if (timezone !== undefined) {
        if (!timezone) {
          return next(ApiError.badRequest('Часовой пояс обязателен'));
        }
      }
      if (avatarFile) {
        if (avatarFile.size > 5 * 1024 * 1024) {
          return next(ApiError.badRequest('Файл аватара слишком большой (max 5MB)'));
        }
        if (!avatarFile.mimetype.startsWith('image/')) {
          return next(ApiError.badRequest('Аватар должен быть изображением'));
        }
        if (!avatarFile.buffer || avatarFile.buffer.length === 0) {
          return next(ApiError.badRequest('Ошибка загрузки файла: буфер пустой'));
        }
      }
      if (deleteAvatar === 'true') {
        const tempUser = await User.findByPk(userId);
        if (!tempUser.avatar) {
          return next(ApiError.badRequest('Аватар не найден для удаления'));
        }
      }

      let user = await User.findByPk(userId);
      if (!user) {
        return next(ApiError.badRequest('Пользователь не найден'));
      }

      let newAvatarPath = user.avatar;

      if (deleteAvatar === 'true') {
        if (user.avatar) {
          const oldAvatarPath = path.resolve(__dirname, '..', 'static', user.avatar);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        }
        newAvatarPath = null;
      }

      if (avatarFile) {
        const mime = avatarFile.mimetype;
        newAvatarPath = await saveAvatar(avatarFile.buffer, userId, mime);

        if (user.avatar) {
          const oldPath = path.resolve(__dirname, '..', 'static', user.avatar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      const updates = {};
      if (fullName !== undefined) updates.fullName = fullName.trim();
      if (userName !== undefined) updates.userName = userName.trim();
      if (timezone !== undefined) updates.timezone = timezone;
      if (newAvatarPath !== user.avatar) updates.avatar = newAvatarPath;

      if (Object.keys(updates).length > 0) {
        await user.update(updates);
        await user.reload();
      }

      const freshUser = await User.findByPk(userId);

      const token = generateJwt(
          freshUser.id,
          freshUser.userName,
          freshUser.role,
          freshUser.avatar,
          freshUser.gmail,
          freshUser.fullName,
          freshUser.timezone,
          freshUser.hasCompletedOnboarding
      );

      return res.json({
        token,
        user: {
          id: freshUser.id,
          fullName: freshUser.fullName,
          userName: freshUser.userName,
          role: freshUser.role,
          avatar: freshUser.avatar || null,
          timezone: freshUser.timezone,
          hasCompletedOnboarding: freshUser.hasCompletedOnboarding,
          createdAt: freshUser.createdAt,
          level: freshUser.level,
          purpose: freshUser.purpose,
          preferredTime: freshUser.preferredTime,
        },
      });
    } catch (e) {
      console.error('updateProfile GLOBAL error:', e.message || e);
      console.error('Stack:', e.stack);
      next(ApiError.internal('Внутренняя ошибка: ' + (e.message || e)));
    }
  }

  async getAll(req, res, next) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'fullName', 'userName', 'avatar', 'role', 'hasCompletedOnboarding'],
      });
      return res.json(users.map(u => ({ ...u.toJSON(), avatar: u.avatar || null })));
    } catch (e) {
      console.error('getAll error:', e);
      next(ApiError.badRequest(e.message));
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const requestingUser = req.user || { role: null, id: null };

      const user = await User.findOne({
        where: { id },
        attributes: [
          'id',
          'fullName',
          'userName',
          (requestingUser.role === 'ADMIN' || requestingUser.role === 'OWNER') ? 'role' : null,
          'avatar',
          'timezone',
          requestingUser.id === Number(id) ? 'gmail' : null,
          'hasCompletedOnboarding',
          'createdAt',
          'level',
          'purpose',
          'preferredTime'
        ].filter(attr => attr !== null),
      });

      if (!user) {
        return next(ApiError.badRequest('Пользователь не найден'));
      }

      let anketa = null;
      if (user.role === 'TEACHER') {
        try {
          anketa = await TeacherAnketa.findOne({ where: { userId: user.id } });
          if (anketa) {
            anketa = { ...anketa.toJSON(), image: anketa.image || null };
          }
        } catch (anketaErr) {
          console.error('Error loading anketa in getOne:', anketaErr.message || anketaErr);
          anketa = null;
        }
      }

      return res.json({
        user: {
          ...user.toJSON(),
          avatar: user.avatar || null,
          createdAt: user.createdAt,
          level: user.level,
          purpose: user.purpose,
          preferredTime: user.preferredTime,
        },
        anketa
      });
    } catch (e) {
      console.error('getOne error:', e);
      next(ApiError.badRequest(e.message));
    }
  }

  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { newRole } = req.body;
      const validRoles = ['USER', 'TEACHER', 'ADMIN', 'OWNER'];
      if (!validRoles.includes(newRole)) {
        return next(ApiError.badRequest('Неверная роль'));
      }

      const requesterRole = req.user.role;
      const targetUser = await User.findByPk(id);
      if (!targetUser) {
        return next(ApiError.badRequest('Пользователь не найден'));
      }

      if (requesterRole === 'ADMIN' && (newRole === 'ADMIN' || newRole === 'OWNER')) {
        return next(ApiError.forbidden('ADMIN не может назначать ADMIN или OWNER'));
      }

      await targetUser.update({ role: newRole });
      console.log(`Role updated: user ${id} to ${newRole} by ${req.user.id}`);

      const token = generateJwt(
          targetUser.id,
          targetUser.userName,
          newRole,
          targetUser.avatar,
          targetUser.gmail,
          targetUser.fullName,
          targetUser.timezone,
          targetUser.hasCompletedOnboarding
      );

      return res.json({
        message: 'Роль обновлена',
        newRole,
        token
      });
    } catch (e) {
      console.error('updateRole error:', e);
      next(ApiError.internal(e.message));
    }
  }

  async downloadTgAvatar(req, res, next) {
    const { photoUrl } = req.body;
    const { id } = req.user;

    const user = await User.findOne({ where: { id } });
    if (!user || user.avatar) return res.json({ message: 'Аватар уже есть' });

    try {
      const axios = require('axios');
      const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'] || 'image/jpeg';
      const buffer = response.data;

      const fileName = await saveAvatar(buffer, user.id, contentType);
      await user.update({ avatar: fileName });

      const token = generateJwt(
          user.id,
          user.userName,
          user.role,
          fileName,
          user.gmail,
          user.fullName,
          user.timezone,
          user.hasCompletedOnboarding
      );

      res.json({
        token,
        avatar: fileName,
        user: {
          id: user.id,
          createdAt: user.createdAt,
          level: user.level,
          purpose: user.purpose,
          preferredTime: user.preferredTime,
        }
      });
    } catch (e) {
      console.error('downloadTgAvatar error:', e);
      next(ApiError.badRequest(e.message));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ where: { id } });
      if (!user) {
        return next(ApiError.badRequest('Пользователь не найден'));
      }
      await user.destroy();
      return res.json({ message: 'Пользователь успешно удален' });
    } catch (e) {
      console.error('delete error:', e);
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new UserController();