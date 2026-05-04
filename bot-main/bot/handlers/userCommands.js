// bot/handlers/userCommands.js (обновлённый: + описание кнопок перед стикером в /start)
const { getInlineKeyboard } = require('../keyboards/keyboards');
const registerUserCommands = (bot, supportGroupId, getInlineKeyboard, animStickerFileId, userStates) => {
  // Обработчик /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Получен /start от user ${msg.from.id} (${msg.from.username || 'no username'})`);
    if (chatId.toString() === supportGroupId) {
      console.log(`⚠️ Игнорируем /start из support-группы (${chatId})`);
      return;
    }
    userStates.delete(chatId); // Сброс
    // ← НОВОЕ: Сначала отправляем описание кнопок
    const welcomeDescription = `
🤖 <b>Добро пожаловать в TucanBras!</b>

<b>Что делают кнопки ниже:</b>
• <b>👤 Профиль</b> — Откройте и отредактируйте ваш профиль в веб-приложении (фото, контакты, описание).
• <b>📋 Мой аккаунт</b> — Покажет информацию о вашем аккаунте (роль, контакты, соцсети).
• <b>🆘 Поддержка</b> — Опишите проблему — наша команда ответит быстро! (поддерживает текст, фото, видео).
• <b>ℹ️ О нас</b> — Узнайте больше о платформе TucanBras.
• <b>💻 Компьютерная версия</b> — Перейдите на десктоп-версию приложения.
• <b>🌐 Наш сайт</b> — Посетите официальный сайт.
• <b>📞 Наши контакты</b> — Контакты команды (Instagram, Telegram и др.).
• <b>🧭 Как пользоваться ботом и приложением</b> — Полная инструкция по использованию.
• <b>❓ FAQ</b> — Часто задаваемые вопросы и ответы.

Выберите опцию ниже! 😊
    `.trim();
    await bot.sendMessage(chatId, welcomeDescription, { parse_mode: 'HTML' });
    // ← Теперь стикер с клавиатурой (как раньше)
    try {
      await bot.sendSticker(chatId, animStickerFileId, {
        reply_markup: getInlineKeyboard()
      });
      console.log('✅ Анимированный TGS-стикер отправлен по file_id!');
    } catch (stickerError) {
      console.error('❌ Ошибка отправки TGS-стикера:', stickerError.message);
      // ← В catch: описание уже отправлено выше, так что только клавиатура
      await bot.sendMessage(chatId, 'Выберите опцию ниже:', { reply_markup: getInlineKeyboard() });
    }
  });
  // Обработчик /profile
  bot.onText(/\/profile/, (msg) => {
    const chatId = msg.chat.id;
    userStates.delete(chatId);
    bot.sendMessage(
      chatId,
      'Профиль доступен в приложении! Выберите опцию ниже:',
      { reply_markup: getInlineKeyboard() }
    );
  });
};
module.exports = { registerUserCommands };