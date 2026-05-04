// bot/handlers/adminCommands.js (обновлённый: + команда /ankety для списка анкет учителей)
const { Op, QueryTypes } = require('sequelize'); // ← ДОБАВЛЕНО: QueryTypes для raw query
const { getGroupKeyboard, getGroupCommands } = require('../keyboards/group');
const { getInlineKeyboard } = require('../keyboards/keyboards'); // ← ФИКС: импорт для /cancel
const registerAdminCommands = (bot, supportGroupId, userStates, User, TeacherAnketa, Op, getGroupKeyboard, getGroupCommands, getInlineKeyboard) => { // ← ФИКС: добавлен TeacherAnketa
  // Команда /help
  bot.onText(/^(ℹ️ )?\/help$/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== supportGroupId) {
      console.log(`⚠️ /help запрошено не в support-группе — игнор`);
      return;
    }
    bot.sendMessage(chatId, getGroupCommands(), {
      parse_mode: 'HTML',
      reply_markup: getGroupKeyboard()
    });
  });
  // Debug-команда /debug_id
  bot.onText(/\/debug_id/, (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    console.log(`🔍 DEBUG: Chat ID = ${chatId}, Type = ${chatType}, Title = ${msg.chat.title || 'Private'}`);
    bot.sendMessage(chatId, `🔍 Debug: Ваш chat ID = \`${chatId}\` (тип: ${chatType}). Используйте для .env.`, {
      parse_mode: 'Markdown',
      reply_markup: getGroupKeyboard()
    });
  });
  // ← НОВАЯ КОМАНДА: /ankety или 📋 /анкеты — список учителей с кнопками
  bot.onText(/^(📋 )?(\/ankety|\/анкеты)$/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== supportGroupId) {
      console.log(`⚠️ /ankety запрошено не в support-группе — игнор`);
      return;
    }
    try {
      console.log('🔍 [ANKETY] Запуск списка анкет учителей...');
      const teachers = await User.findAll({
        where: { role: 'TEACHER' },
        include: [{ model: TeacherAnketa, required: false }],
        order: [['createdAt', 'DESC']],
        raw: false // Не raw, чтобы include работал
      });
      if (teachers.length === 0) {
        await bot.sendMessage(chatId, '📋 Нет анкет учителей.', { reply_markup: getGroupKeyboard() });
        return;
      }
      let keyboardRows = [];
      let infoText = '📋 **Анкеты учителей:**\n\n';
      teachers.forEach((teacher, index) => {
        const anketa = teacher.TeacherAnketa;
        const teacherName = anketa ? anketa.fullName : teacher.userName || 'Не указано';
        infoText += `${index + 1}. ${teacherName} (@${teacher.userName || 'no username'})\n`;
        keyboardRows.push([{ text: `👀 Посмотреть анкету ${teacherName}`, callback_data: `view_anketa_${teacher.id}` }]);
      });
      infoText += '\nВыберите анкету ниже:';
      const keyboard = { inline_keyboard: keyboardRows };
      await bot.sendMessage(chatId, infoText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      console.log(`✅ [ANKETY] Отправлено ${teachers.length} анкет в группу`);
    } catch (anketyError) {
      console.error('❌ [ANKETY] Ошибка:', anketyError);
      await bot.sendMessage(chatId, '❌ Ошибка загрузки анкет. Проверьте БД.', { reply_markup: getGroupKeyboard() });
    }
  });
  // Команда /broadcast (обновлённая: + выбор аудитории)
  bot.onText(/^(📢 )?\/broadcast$/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== supportGroupId) {
      console.log(`⚠️ /broadcast запрошено не в support-группе — игнор`);
      return;
    }
    try {
      console.log(`🔍 [BROADCAST] Команда /broadcast от ${msg.from.id} в чате ${chatId}`);
      userStates.delete(chatId);
      userStates.delete(`${chatId}_broadcast_text`);
      userStates.delete(`${chatId}_broadcast_media`);
      userStates.delete(`${chatId}_audience`); // ← НОВОЕ: сброс выбора аудитории
      userStates.set(chatId, 'broadcast_confirm');
      console.log(`✅ [BROADCAST] State set to 'broadcast_confirm' for chatId ${chatId} (Map size: ${userStates.size})`);
      // ← НОВОЕ: Клавиатура выбора аудитории
      const audienceKeyboard = {
        inline_keyboard: [
          [{ text: '👥 Всем пользователям', callback_data: 'broadcast_audience_all' }],
          [{ text: '👩‍🎓 Ученикам (USER)', callback_data: 'broadcast_audience_students' }],
          [{ text: '👨‍🏫 Преподавателям (TEACHER)', callback_data: 'broadcast_audience_teachers' }]
        ]
      };
      const eligibleCount = await User.count({ where: { telegramId: { [Op.ne]: null } } });
      const confirmText = `
📢 **Подтверждение рассылки**
Выберите аудиторию (всего ${eligibleCount} активных пользователей):
${audienceKeyboard.inline_keyboard.map(row => row.map(btn => btn.text).join(' | ')).join('\n')}
Поддерживает текст, фото или видео (с подписью).
Внимание: Telegram лимитирует ~30 сообщений/сек. Процесс займёт время.
После выбора аудитории отправьте сообщение ниже (или /cancel):
      `.trim();
      await bot.sendMessage(chatId, confirmText, {
        parse_mode: 'Markdown',
        reply_markup: audienceKeyboard // ← НОВОЕ: клавиатура выбора
      });
      console.log(`✅ [BROADCAST] Подтверждение с выбором аудитории отправлено для ${chatId}`);
    } catch (err) {
      console.error('❌ [BROADCAST] Ошибка в /broadcast:', err);
      userStates.delete(chatId);
      await bot.sendMessage(chatId, '❌ Ошибка подготовки рассылки (проверьте БД).', {
        reply_markup: getGroupKeyboard()
      });
    }
  });
  // Команда /cancel
  bot.onText(/^(❌ )?\/cancel$/, (msg) => {
    const chatId = msg.chat.id;
    const currentState = userStates.get(chatId);
    console.log(`🔍 [CANCEL] /cancel от ${msg.from.id} в ${chatId}, state: ${currentState}`);
    if (currentState === 'broadcast_confirm' || currentState === 'broadcast_ready') {
      userStates.delete(chatId);
      userStates.delete(`${chatId}_broadcast_text`);
      userStates.delete(`${chatId}_broadcast_media`);
      userStates.delete(`${chatId}_audience`); // ← НОВОЕ: сброс аудитории
      bot.sendMessage(chatId, '❌ Рассылка отменена. Выберите опцию ниже:', {
        reply_markup: getGroupKeyboard()
      });
      console.log(`✅ [BROADCAST] Отмена по /cancel для ${chatId}`);
    } else if (currentState === 'support_mode') {
      userStates.delete(chatId);
      bot.sendMessage(chatId, '❌ Режим поддержки отменён. Выберите опцию ниже:', {
        reply_markup: getInlineKeyboard() // ← ФИКС: теперь доступен
      });
      console.log(`🔍 [SUPPORT] Отмена по /cancel от ${msg.from.id}`);
    } else {
      bot.sendMessage(chatId, 'ℹ️ Ничего не отменено (нет активного режима).', {
        reply_markup: chatId.toString() === supportGroupId ? getGroupKeyboard() : getInlineKeyboard() // ← ФИКС: используем импортированный
      });
    }
  });
  // Команда /stats (полностью переписанная: HTML с \n, QueryTypes для AVG, лог raw avgResult, без <br>)
  bot.onText(/^(📊 )?(\/stats|\/статистика)$/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== supportGroupId) {
      console.log(`⚠️ /stats запрошено не в support-группе (${chatId}) — игнор`);
      return;
    }
    try {
      console.log('🔍 [STATS] Запуск статистики...');
      if (!User || !User.sequelize) {
        throw new Error('Модель User или sequelize не инициализированы в ./models/models');
      }
      console.log('🔍 [STATS] Модель User OK');
      const totalUsers = await User.count();
      console.log(`🔍 [STATS] totalUsers: ${totalUsers}`);
      const roleCounts = await User.findAll({
        attributes: [
          'role',
          [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
        ],
        group: ['role'],
        raw: true
      });
      console.log(`🔍 [STATS] roleCounts:`, JSON.stringify(roleCounts));
      const roleMap = { USER: 'Студент', TEACHER: 'Преподаватель', ADMIN: 'Админ', OWNER: 'Владелец' };
      const formattedRoles = roleCounts.length > 0
        ? roleCounts.map(r => `<b>${roleMap[r.role] || r.role}:</b> ${r.count}`).join('\n')
        : 'Нет пользователей';
      let avgDate = 'N/A';
      try {
        // Фикс AVG: raw query с QueryTypes.SELECT, без LIMIT (агрегат по всем)
        const avgEpochQuery = `
          SELECT to_timestamp(AVG(EXTRACT(epoch FROM "createdAt"))) AS avgDate
          FROM "Users"
        `;
        const avgResults = await User.sequelize.query(avgEpochQuery, {
          type: QueryTypes.SELECT,
          raw: true
        });
        const avgResult = avgResults[0];
        console.log('🔍 [STATS] Raw avgResult:', JSON.stringify(avgResult)); // ← ДЕБАГ: покажет, почему N/A
        if (avgResult && avgResult.avgDate) {
          // avgDate — Date объект в raw, toLocaleDateString
          avgDate = new Date(avgResult.avgDate).toLocaleDateString('ru-RU');
        }
        console.log(`🔍 [STATS] avgDate: ${avgDate}`);
      } catch (avgErr) {
        console.warn('⚠️ [STATS] Ошибка AVG(createdAt):', avgErr.message);
        avgDate = 'Ошибка расчёта';
      }
      let allUsersList = 'Нет данных';
      try {
        const allUsers = await User.findAll({
          attributes: ['id', 'userName', 'createdAt', 'role'],
          order: [['createdAt', 'DESC']],
          raw: true
        });
        if (allUsers.length > 0) {
          allUsersList = allUsers.map(u =>
            `• ID: ${u.id} | Username: ${u.userName ? `@${u.userName}` : 'no username'} | Дата: ${new Date(u.createdAt).toLocaleString('ru-RU')} | Роль: ${roleMap[u.role] || u.role}`
          ).join('\n'); // ← \n вместо <br>
        }
        console.log(`🔍 [STATS] allUsers count: ${allUsers.length}`);
      } catch (allErr) {
        console.warn('⚠️ [STATS] Ошибка allUsers:', allErr.message);
        allUsersList = 'Ошибка загрузки списка';
      }
      const currentDate = new Date().toLocaleString('ru-RU');
      const statsTextPart1 = `📊 <b>Статистика пользователей (на ${currentDate}):</b>\n👥 <b>Всего пользователей:</b> ${totalUsers}\n🏷️ <b>По ролям:</b>\n${formattedRoles}\n📅 <b>Средняя дата регистрации:</b> ${avgDate}`;
      const statsTextPart2 = `\n🆕 <b>Список всех пользователей:</b>\n${allUsersList}\n<i>Данные из БД. Для детальной аналитики — в дашборде.</i>`;
      const fullText = statsTextPart1 + statsTextPart2;
      // Разбиваем, если слишком длинно (Telegram лимит ~4096 байт)
      if (Buffer.byteLength(fullText, 'utf8') > 4000) {
        await bot.sendMessage(chatId, statsTextPart1, {
          parse_mode: 'HTML',
          reply_markup: getGroupKeyboard()
        });
        await bot.sendMessage(chatId, statsTextPart2, {
          parse_mode: 'HTML',
          reply_markup: getGroupKeyboard()
        });
      } else {
        await bot.sendMessage(chatId, fullText, {
          parse_mode: 'HTML',
          reply_markup: getGroupKeyboard()
        });
      }
      console.log('✅ [STATS] Статистика отправлена в группу');
    } catch (statsError) {
      console.error('❌ [STATS] КРИТИЧЕСКАЯ ОШИБКА (полный стек):', statsError.message, statsError.stack);
      await bot.sendMessage(chatId, '<b>❌ Ошибка загрузки статистики.</b> Проверьте БД (см. консоль сервера).', {
        parse_mode: 'HTML',
        reply_markup: getGroupKeyboard()
      });
    }
  });
};
module.exports = { registerAdminCommands };