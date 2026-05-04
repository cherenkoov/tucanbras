// bot/handlers/callbackHandlers.js (фикс: показывать user info даже без анкеты + фикс доступа к TeacherAnketum)
const { Op } = require('sequelize');
const { getInlineKeyboard } = require('../keyboards/keyboards');
const { getGroupKeyboard } = require('../keyboards/group');
const path = require('path');
const fs = require('fs');
const handleCallbacks = async (bot, query, userStates, User, TeacherAnketa, Op, getInlineKeyboard, getGroupKeyboard, supportGroupId, animStickerFileId, supportStickerFileId, path, fs) => {
  bot.answerCallbackQuery(query.id).catch((err) => {
    if (err.message.includes('query is too old')) {
      console.warn('⚠️ Callback устарел (задержка >30с) — игнор');
    } else {
      console.error('Ошибка answerCallbackQuery:', err);
    }
  });
  console.log(`🔍 Callback от ${query.from.id}: ${query.data}`);
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  // Обработка view_anketa_{teacherId}
  if (query.data.startsWith('view_anketa_')) {
    const teacherId = query.data.split('_')[2];
    try {
      const teacher = await User.findByPk(teacherId, { include: [{ model: TeacherAnketa, required: false }] });
      if (!teacher) {
        await bot.sendMessage(chatId, '❌ Пользователь не найден.', { reply_markup: getGroupKeyboard() });
        return;
      }
      const anketa = teacher.TeacherAnketum; // ← ФИКС: Используем правильное имя свойства из ассоциации/алиаса (по логу: TeacherAnketum)
      if (!anketa) {
        // ← ФИКС: Показываем базовую info пользователя, если анкеты нет
        const noAnketaText = `
📋 **Профиль преподавателя: ${teacher.userName || 'Не указано'}**
👤 **ФИО:** Не заполнено (анкета отсутствует)
🌐 **Языки:** Не заполнено
💬 **Цитата:** Не заполнено
📝 **Описание:** Не заполнено
💰 **Цена:** Не заполнено
📧 **Gmail:** ${teacher.gmail}
📱 **Телефон:** ${teacher.phoneNumber || 'Не указан'}
🔗 **Telegram:** ${teacher.telegram || 'Не указан'}
🆔 **ID:** ${teacher.id}
<i>Анкета не создана. Попросите преподавателя заполнить в приложении.</i>
        `.trim();
        if (teacher.avatar) {
          const avatarLocalPath = path.resolve(__dirname, '..', '..', 'static', teacher.avatar);
          if (fs.existsSync(avatarLocalPath)) {
            await bot.sendPhoto(chatId, avatarLocalPath, { caption: noAnketaText, parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
          } else {
            await bot.sendMessage(chatId, noAnketaText, { parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
          }
        } else {
          await bot.sendMessage(chatId, noAnketaText, { parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
        }
        console.log(`✅ [ANKETY] Показан профиль без анкеты для ${teacherId}`);
        return;
      }
      // Если анкета есть — стандартный текст
      const languagesText = anketa.languages ? anketa.languages.map(lang => `${lang.flag} ${lang.name}`).join(', ') : 'Не указаны';
      const anketaText = `
📋 **Анкета преподавателя: ${teacher.userName || 'Не указано'}**
👤 **ФИО:** ${anketa.fullName || 'Не указано'}
🌐 **Языки:** ${languagesText}
💬 **Цитата:** ${anketa.quote || 'Не указана'}
📝 **Описание:** ${anketa.description || 'Не указано'}
💰 **Цена (руб/час):** ${anketa.price || 'Не указана'}
📧 **Gmail:** ${teacher.gmail}
📱 **Телефон:** ${teacher.phoneNumber || 'Не указан'}
🔗 **Telegram:** ${teacher.telegram || 'Не указан'}
🆔 **ID:** ${teacher.id}
      `.trim();
      if (anketa.image) {
        const imageLocalPath = path.resolve(__dirname, '..', '..', 'static', anketa.image);
        if (fs.existsSync(imageLocalPath)) {
          await bot.sendPhoto(chatId, imageLocalPath, { caption: anketaText, parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
        } else {
          await bot.sendMessage(chatId, anketaText, { parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
        }
      } else {
        await bot.sendMessage(chatId, anketaText, { parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
      }
      console.log(`✅ [ANKETY] Анкета ${teacherId} отправлена в группу`);
    } catch (viewErr) {
      console.error('❌ [ANKETY VIEW] Ошибка:', viewErr);
      await bot.sendMessage(chatId, '❌ Ошибка загрузки анкеты.', { reply_markup: getGroupKeyboard() });
    }
    return;
  }
  // ← НОВОЕ: Обработка выбора аудитории
  if (query.data.startsWith('broadcast_audience_')) {
    const audience = query.data.split('_')[2]; // all, students, teachers
    if (userStates.get(chatId) !== 'broadcast_confirm') {
      await bot.answerCallbackQuery(query.id, { text: 'Сессия устарела. /broadcast заново.' });
      return;
    }
    userStates.set(`${chatId}_audience`, audience);
    userStates.set(chatId, 'broadcast_ready_for_input'); // Новый state: ждём ввода сообщения
    let audienceCount = 0;
    let whereClause = { telegramId: { [Op.ne]: null } };
    if (audience === 'students') {
      whereClause.role = { [Op.in]: ['USER'] };
    } else if (audience === 'teachers') {
      whereClause.role = { [Op.in]: ['TEACHER'] };
    }
    // Для 'all' — без фильтра роли
    audienceCount = await User.count({ where: whereClause });
    await bot.answerCallbackQuery(query.id, { text: `Выбрано: ${audienceCount} получателей (${audience})` });
    await bot.sendMessage(chatId, `✅ Аудитория: ${audience === 'all' ? 'Всем' : audience === 'students' ? 'Ученикам' : 'Преподавателям'} (${audienceCount} чел.)\n\nОтправьте сообщение для рассылки ниже (или /cancel):`, {
      reply_markup: getGroupKeyboard()
    });
    console.log(`✅ [BROADCAST] Audience selected: ${audience} (${audienceCount} users) for ${chatId}`);
    return;
  }
  if (query.data === 'about') { // ← ОБНОВЛЕНО: Полный текст о платформе TucanBras + эмодзи
    const aboutText = `ℹ️ **О нас: TucanBras — ваша образовательная платформа для Бразилии!** 🌟
TucanBras — это инновационная онлайн-платформа, созданная специально для студентов и преподавателей, изучающих португальский язык и бразильскую культуру. 📚 Мы объединяем современные технологии и проверенные методики обучения, чтобы сделать процесс изучения увлекательным, эффективным и доступным для всех. 🚀
**Что мы предлагаем:** 💡
- **Курсы и уроки:** Интерактивные модули по грамматике, разговорной практике, вокабуляру и культурным аспектам. От начинающих до продвинутых уровней (A1–C2 по CEFR). 🎓
- **Для студентов:** Персонализированные планы обучения, тесты, сертификаты и чаты для практики с носителями. 👩‍🎓👨‍🎓
- **Для преподавателей:** Инструменты для создания курсов, управление классами, аналитика прогресса учеников и монетизация контента. 👨‍🏫
- **Сообщество:** Форумы, вебинары и события — общение с единомышленниками из Бразилии и мира. 🌍
- **Мобильность:** Полная интеграция с Telegram-ботом и Web App — учитесь в любое время, на любом устройстве. 📱💻
**Наша миссия:** Сделать бразильский португальский ближе и интереснее! 🌴 Мы верим, что язык — ключ к культуре, и помогаем тысячам пользователей открыть для себя яркий мир Бразилии: от карнавала в Рио до самбы и футбола. ⚽🎉
**Факты о нас:** 📊
- Основана в 2024 году энтузиастами из Бразилии и России. 🇧🇷🇷🇺
- Более 5000 активных пользователей. 👥
- Партнёрства с языковыми школами в Сан-Паулу и Рио-де-Жанейро. 🤝
- 100% фокус на практике: 70% уроков — разговоры и иммерсия. 🗣️
Больше деталей на нашем сайте: https://tucanbras.netlify.app. Присоединяйтесь к сообществу и начните путь к fluency уже сегодня! 🌴🇧🇷✨
Выберите опцию ниже:`;
    bot.sendMessage(chatId, aboutText, { parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
  } else if (query.data === 'support') {
    userStates.set(chatId, 'support_mode');
    const supportMessage = '👋 Опишите вашу проблему! 📝 Прикрепите изображения, скриншоты или видео, если нужно. 📸🎥 Служба поддержки свяжется с вами в ближайшее время. 😊';
    try {
      await bot.sendSticker(chatId, supportStickerFileId);
      console.log('✅ TGS-стикер отправлен для поддержки по file_id!');
    } catch (stickerError) {
      console.error('❌ Ошибка отправки TGS для поддержки:', stickerError.message);
    }
    await bot.sendMessage(chatId, supportMessage);
    console.log(`User ${userId} вошёл в support_mode`);
  } else if (query.data === 'myinfo') {
    try {
      console.log(`🔍 Запрос профиля для TG user ${userId}`);
      if (!User.sequelize) throw new Error('Sequelize не инициализирован');
      const user = await User.findOne({ where: { telegramId: userId } });
      if (!user) {
        console.log(`❌ Пользователь ${userId} не в БД`);
        await bot.sendMessage(chatId, '❌ Профиль не найден. Зарегистрируйтесь через /start → Профиль.', { reply_markup: getInlineKeyboard() });
        return;
      }
      const roleMap = { USER: 'Студент', TEACHER: 'Преподаватель', ADMIN: 'Админ', OWNER: 'Владелец' };
      const roleDisplay = roleMap[user.role] || user.role;
      const infoText = `
📋 **Информация о вас:**
👤 **Username:** ${user.userName || 'Не указан'}
📧 **Gmail:** ${user.gmail}
📱 **Телефон:** ${user.phoneNumber || 'Не указан'}
🏷️ **Роль:** ${roleDisplay}
📝 **Описание:** ${user.description || 'Не указано'}
${user.banner ? `🖼️ **Баннер:** Есть (в профиле)` : ''}
      `.trim();
      if (user.avatar) {
        const avatarLocalPath = path.resolve(__dirname, '..', '..', 'static', user.avatar); // Относительно корня
        console.log('📸 Sending avatar:', avatarLocalPath);
        if (fs.existsSync(avatarLocalPath)) {
          await bot.sendPhoto(chatId, avatarLocalPath, { caption: infoText, parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
        } else {
          console.warn('⚠️ Avatar not found:', avatarLocalPath);
          await bot.sendMessage(chatId, infoText, { parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
        }
      } else {
        await bot.sendMessage(chatId, infoText, { parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
      }
      console.log('✅ Profile sent:', { userId: user.id, role: user.role });
    } catch (dbError) {
      console.error('❌ Profile error:', dbError.message, dbError.stack);
      await bot.sendMessage(chatId, '❌ Ошибка загрузки профиля. Проверьте БД.', { reply_markup: getInlineKeyboard() });
    }
  } else if (query.data === 'howto') { // ← ОБНОВЛЕНО: Полный текст инструкции по использованию + эмодзи
    const howtoText = `🧭 **Как пользоваться ботом и приложением TucanBras** 📖
Привет! 😊 TucanBras — это удобная платформа для студентов и преподавателей, где вы можете управлять профилем, общаться и получать обновления. 🌟 Бот в Telegram — это ваш быстрый вход в экосистему, а приложение (Web App) — полноценный интерфейс для редактирования данных. Вот пошаговая инструкция: 🛤️
**1. Запуск бота** 🚀
- Найдите бота в Telegram по имени @TucanBrasBot (или через поиск). 🔍
- Нажмите /start — бот отправит приветствие с описанием кнопок и анимированный стикер. 🎉
- Если вы новичок, бот предложит зарегистрироваться через профиль (см. ниже). 🆕
**2. Основные функции бота** ⚙️
Бот использует инлайн-кнопки для навигации. После /start появится меню: 📱
- **👤 Профиль**: Откроет Web App в Telegram (встроенный браузер). Здесь вы можете:
  - Загрузить аватар, баннер и описание. 📸🖼️
  - Указать контакты: Gmail, телефон, Telegram, Instagram, TikTok. 📧📱🔗📸🎵
  - Выбрать роль (студент/преподаватель — если нужно, бот проверит по БД). 👩‍🎓👨‍🏫
  - Сохранить изменения — они обновятся в вашей учётной записи. 💾
- **📋 Мой аккаунт**: Покажет текущие данные из профиля (роль, контакты, соцсети). Если ничего не заполнено — подскажет, как редактировать. 👤
- **🆘 Поддержка**: Войдите в режим чата — опишите проблему текстом, фото или видео. Бот перешлёт в группу поддержки, и менеджеры ответят в течение 1–2 часов. 💬📤
- **ℹ️ О нас**: Краткая информация о платформе (TucanBras — образовательная сеть для Бразилии с фокусом на языки и курсы). 🌍
- **💻 Компьютерная версия**: Перейдёт на десктоп-сайт для полного экрана. 🖥️
- **🌐 Наш сайт**: Откроет основной сайт. 🌐
- **📞 Наши контакты**: Ссылки на соцсети и менеджеров (см. раздел контактов). 📞
- **🧭 Как пользоваться**: Вы уже здесь! 😄
- **❓ FAQ**: Ответы на частые вопросы (см. ниже). ❓
**Совет**: Все кнопки возвращают меню в конце, чтобы не потеряться. Если что-то сломалось — используйте /start или /profile. 🔄
**3. Работа с приложением (Web App)** 🌐
- Откройте через кнопку **Профиль** в боте — это запустит https://tucanbras.netlify.app прямо в Telegram (или на десктопе). 📲
- **Авторизация**: Войдите по Telegram ID (бот автоматически свяжет аккаунт). 🔐
- **Основные разделы**:
  - **Профиль**: Редактируйте фото, текст, контакты. Загружайте файлы до 5 МБ. ✏️
  - **Курсы/Группы**: Просматривайте доступные курсы (для студентов — расписание; для преподавателей — управление классами). 📚👥
  - **Чат/Сообщения**: Интеграция с Telegram — пишите напрямую. 💬
  - **Настройки**: Измените роль, уведомления, экспорт данных. ⚙️
- **Мобильность**: Работает на iOS/Android в Telegram; десктоп — через браузер. 📱💻
- **Синхронизация**: Изменения в app сразу видны в боте (и наоборот). 🔄
**4. Полезные советы** 💡
- **Регистрация**: Если профиль пустой, заполните его в app — бот использует данные из БД. 🆕
- **Ограничения**: Бот не хранит пароли (только Telegram ID). Для рассылок (анонсов) — только админы в специальной группе. 🔒
- **Обновления**: Следите за анонсами в Telegram-канале (@tucanbras). 🔔
- **Проблемы?** Пишите в поддержку — прикрепляйте скрины! 🆘📸
Если что-то неясно, уточни — помогу! 🚀`;
    bot.sendMessage(chatId, howtoText, { parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
  } else if (query.data === 'faq') { // ← ОБНОВЛЕНО: Полный текст FAQ + эмодзи
    const faqText = `❓ **FAQ: Часто задаваемые вопросы** 📋
Вот ответы на популярные вопросы. Если вашего нет — спроси в поддержке! 🆘
**Q: Как зарегистрироваться?** 🆕
A: Просто напишите /start боту — он создаст аккаунт по вашему Telegram ID. Затем откройте Профиль и заполните данные. Роль (студент/преподаватель) можно выбрать в app. 📝
**Q: Почему профиль пустой?** 🤔
A: Это нормально для новичков! Перейдите в Web App (кнопка 👤 Профиль) и добавьте Gmail, фото, соцсети. Бот обновит info через 1–2 минуты. ⏱️
**Q: Можно ли изменить роль (с студента на преподавателя)?** 🔄
A: Да, но только через поддержку — напишите в 🆘 с обоснованием. Админы проверят и обновят в БД. ✅
**Q: Как прикрепить фото/видео в поддержку?** 📸
A: Нажмите 🆘, затем отправьте сообщение с медиа. Бот перешлёт в группу — ответ придет в ваш чат. 📤💬
**Q: Что делать, если Web App не открывается?** ❌
A: Убедитесь, что Telegram обновлён. Альтернатива: откройте https://tucanbras.netlify.app в браузере и авторизуйтесь по ссылке из бота. 🔄
**Q: Есть ли мобильное app (не Web)?** 📱
A: Пока только Web App в Telegram. Десктоп-версия на сайте. Полноценное app в планах на 2026. 🛠️
**Q: Как получить статистику или анонсы?** 📊
A: Анонсы приходят автоматически (если профиль заполнен). Статистика — для админов в специальной группе. 🔔
**Q: Безопасно ли делиться контактами?** 🔒
A: Да, данные хранятся в защищённой БД (Sequelize/PostgreSQL). Видны только вам и поддержке. Можно удалить в настройках. 🛡️
**Q: Почему рассылка занимает время?** ⏳
A: Telegram лимитирует 30 сообщений/сек. Для 1000+ пользователей — до 5 мин. С фото/видео — дольше. ⚡
Если вопрос срочный — жми 🆘! 😊`;
    bot.sendMessage(chatId, faqText, { parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
  } else if (query.data === 'site') {
    bot.sendMessage(chatId, '🌐 **Сайт:** https://tucanbras.netlify.app (в разработке).', { parse_mode: 'Markdown', reply_markup: getInlineKeyboard() });
  } else if (query.data === 'contacts') { // ← ОБНОВЛЕНО: Полноценные контакты с TikTok, Instagram, Telegram и менеджером + эмодзи
    const contactsText = `

👥 **Контакты менеджера:** 🤝
• <b>Главный менеджер:</b> <a href="tg://user?id=123456789">@manager_username</a> — Для вопросов по подписке и партнёрствам. 💼
• <b>Поддержка:</b> <a href="https://t.me/support_tucanbras">@support_tucanbras</a> — Быстрые ответы 24/7. ⚡😊
Если нужно что-то уточнить — пишите в поддержку! 📩
    `.trim();
    await bot.sendMessage(chatId, contactsText, {
      parse_mode: 'HTML',
      reply_markup: getInlineKeyboard()
    });
    console.log(`📞 Contacts requested by ${userId} in chat ${chatId}`);
  } else if (query.data === 'desktop_version') { // ← ВНЕДРЕНО: Обработка клика на "Компьютерная версия"
    console.log(`💻 Desktop version requested by ${userId} in chat ${chatId}`);
    const desktopMessage = `💻 **Компьютерная версия приложения**
[Перейти по ссылке](https://tucanbras.netlify.app)`;
    await bot.sendMessage(chatId, desktopMessage, {
      parse_mode: 'Markdown',
      reply_markup: getInlineKeyboard() // Возвращаем клавиатуру для продолжения
    });
    await bot.answerCallbackQuery(query.id, { text: 'Ссылка отправлена! 💻' });
  } else if (query.data === 'broadcast_send') {
    console.log(`🔍 [BROADCAST CB] Send clicked for ${chatId}, state: ${userStates.get(chatId)}`);
    if (userStates.get(chatId) !== 'broadcast_ready') { // State теперь 'broadcast_ready' после preview
      await bot.answerCallbackQuery(query.id, { text: 'Сессия устарела. /broadcast заново.' });
      return;
    }
    const savedText = userStates.get(`${chatId}_broadcast_text`) || '';
    const savedMedia = userStates.get(`${chatId}_broadcast_media`);
    const audience = userStates.get(`${chatId}_audience`) || 'all'; // ← НОВОЕ: выбор аудитории
    // Сброс states
    userStates.delete(chatId);
    userStates.delete(`${chatId}_broadcast_text`);
    userStates.delete(`${chatId}_broadcast_media`);
    userStates.delete(`${chatId}_audience`);
    try {
      let whereClause = { telegramId: { [Op.ne]: null } };
      if (audience === 'students') {
        whereClause.role = { [Op.in]: ['USER'] };
      } else if (audience === 'teachers') {
        whereClause.role = { [Op.in]: ['TEACHER'] };
      }
      const totalUsers = await User.count({ where: whereClause });
      if (totalUsers === 0) {
        await bot.sendMessage(chatId, `⚠️ Нет получателей в группе "${audience}".`, { reply_markup: getGroupKeyboard() });
        await bot.answerCallbackQuery(query.id, { text: 'Нет получателей.' });
        return;
      }
      const users = await User.findAll({ attributes: ['telegramId'], where: whereClause, raw: true });
      let sentCount = 0, failedCount = 0;
      const fullText = savedText ? `📢 Анонс от TucanBras:\n\n${savedText}` : '📢 Анонс от TucanBras:';
      const audienceLabel = audience === 'all' ? 'всем' : audience === 'students' ? 'ученикам' : 'преподавателям';
      await bot.sendMessage(chatId, `🚀 Рассылка ${audienceLabel} (${totalUsers} получателей)...`, { reply_markup: getGroupKeyboard() });
      await bot.answerCallbackQuery(query.id, { text: 'Запущено!' });
      for (const user of users) {
        try {
          if (savedMedia) {
            if (savedMedia.type === 'photo') {
              await bot.sendPhoto(user.telegramId, savedMedia.fileId, { caption: fullText, parse_mode: 'Markdown' });
            } else if (savedMedia.type === 'video') {
              await bot.sendVideo(user.telegramId, savedMedia.fileId, { caption: fullText, parse_mode: 'Markdown' });
            }
          } else {
            await bot.sendMessage(user.telegramId, fullText, { parse_mode: 'Markdown' });
          }
          sentCount++;
          console.log(`✅ Sent to ${user.telegramId} (${sentCount}/${totalUsers}) ${savedMedia ? `(media: ${savedMedia.type})` : ''} [audience: ${audience}]`);
        } catch (sendErr) {
          console.warn(`⚠️ Failed ${user.telegramId}: ${sendErr.message}`);
          failedCount++;
        }
        await new Promise(r => setTimeout(r, 100)); // Delay
      }
      const reportText = `
✅ **Завершено!** (${audienceLabel})
📊 Отправлено: ${sentCount}, Ошибок: ${failedCount} (из ${totalUsers})
Текст: "${savedText || 'Без текста'}"
${savedMedia ? `Медиа: ${savedMedia.type}` : ''}
      `.trim();
      await bot.sendMessage(chatId, reportText, { parse_mode: 'Markdown', reply_markup: getGroupKeyboard() });
      console.log(`✅ Broadcast done: ${sentCount}/${totalUsers} [${audience}] ${savedMedia ? `(media: ${savedMedia.type})` : ''}`);
    } catch (broadcastErr) {
      console.error('❌ Broadcast error:', broadcastErr);
      await bot.answerCallbackQuery(query.id, { text: 'Ошибка.' });
      await bot.sendMessage(chatId, '❌ Ошибка рассылки.', { reply_markup: getGroupKeyboard() });
    }
  } else if (query.data === 'broadcast_cancel') {
    console.log(`🔍 [BROADCAST CB] Cancel clicked for ${chatId}`);
    userStates.delete(chatId);
    userStates.delete(`${chatId}_broadcast_text`);
    userStates.delete(`${chatId}_broadcast_media`);
    userStates.delete(`${chatId}_audience`); // ← НОВОЕ: сброс
    await bot.sendMessage(chatId, '❌ Рассылка отменена.', { reply_markup: getGroupKeyboard() });
    await bot.answerCallbackQuery(query.id, { text: 'Отменено.' });
  }
};
module.exports = { handleCallbacks };