// bot/handlers/supportHandlers.js (обновлённый: + стикер перед welcome в handleNewMembers)
const { getInlineKeyboard } = require('../keyboards/keyboards');
const { escapeHtml } = require('../utils/helpers');
const handleNewMembers = async (bot, msg, supportGroupId, getGroupKeyboard, getGroupCommands, escapeHtml) => {
  console.log(`🔍 [WELCOME] New members detected in group ${msg.chat.id}`);
  setTimeout(() => {
    msg.new_chat_members.forEach((newMember) => {
      const escapedUsername = escapeHtml(newMember.username ? `@${newMember.username}` : newMember.first_name || 'Новый менеджер');
      console.log(`🔍 [WELCOME] Processing new member: ${escapedUsername} (ID: ${newMember.id})`);
      const welcomeText = `
👋 <b>Добро пожаловать в менеджерскую группу, ${escapedUsername}!</b>
Вы теперь часть команды TucanBras! Здесь мы обрабатываем support-запросы, уведомления и аналитику.
${getGroupCommands()}
      `.trim();
      // ← НОВОЕ: Сначала отправляем стикер поддержки
      bot.sendSticker(msg.chat.id, 'CAACAgIAAxkBAmBvEmj1YWgiQ5XbUgnBu34fy1qLPbdrAAKvCwAC_WmBSmHwJMEXoU_ENgQ')
        .then(() => {
          console.log(`✅ [WELCOME] Support стикер отправлен для ${escapedUsername} (ID: ${newMember.id})`);
          // ← Потом welcome текст с клавиатурой
          bot.sendMessage(msg.chat.id, welcomeText, {
            parse_mode: 'HTML',
            reply_markup: getGroupKeyboard()
          })
            .then(() => console.log(`✅ [WELCOME] Sent to ${escapedUsername} (ID: ${newMember.id})`))
            .catch((err) => console.error('❌ [WELCOME] Error sending welcome text:', err.message));
        })
        .catch((stickerErr) => {
          console.error('❌ [WELCOME] Error sending support sticker:', stickerErr.message);
          // ← Если стикер не отправился, всё равно отправляем текст
          bot.sendMessage(msg.chat.id, welcomeText, {
            parse_mode: 'HTML',
            reply_markup: getGroupKeyboard()
          })
            .then(() => console.log(`✅ [WELCOME] Fallback text sent to ${escapedUsername} (ID: ${newMember.id})`))
            .catch((err) => console.error('❌ [WELCOME] Fallback error:', err.message));
        });
    });
  }, 1000);
};
const handleSupportMode = async (bot, msg, chatId, supportGroupId, userStates, getInlineKeyboard, userId, username) => {
  console.log(`🔍 [SUPPORT] Forwarding from ${userId} (${username}): ${msg.text || 'media'}`);
  bot.forwardMessage(supportGroupId, chatId, msg.message_id)
    .then(() => {
      console.log('✅ [SUPPORT] Forward success');
      bot.sendMessage(chatId, '✅ Ваше сообщение отправлено в поддержку📤. Ответим скоро! 😊 Выберите опцию ниже: 👇', { reply_markup: getInlineKeyboard() });
      userStates.delete(chatId);
    })
    .catch(async (forwardError) => {
      console.error('❌ [SUPPORT] Forward error:', forwardError.message || forwardError);
      let fallbackMessage = 'Ошибка отправки. Попробуйте позже или свяжитесь с @support. Выберите опцию ниже:';
      if (forwardError.message?.includes('group chat was upgraded')) {
        console.error('🔍 [SUPPORT] Group upgraded — update SUPPORT_GROUP_ID with /debug_id');
        fallbackMessage = '⚠️ Группа обновлена — support временно недоступен. Свяжитесь с @support вручную. Выберите опцию ниже:';
      } else if (forwardError.message?.includes('chat not found')) {
        console.error('🔍 [SUPPORT] Chat not found — check SUPPORT_GROUP_ID and bot membership');
        fallbackMessage = '⚠️ Support недоступен (группа не найдена). Свяжитесь с @support. Выберите опцию ниже:';
      }
      try {
        const mentionHtml = `<a href="tg://user?id=${userId}">${username}</a>`;
        const supportText = `Support от ${mentionHtml} (${new Date().toLocaleString('ru-RU')}):\n\n${msg.text || '[Медиа]'} `;
        if (msg.photo) {
          await bot.sendPhoto(supportGroupId, msg.photo[msg.photo.length - 1].file_id, { caption: supportText, parse_mode: 'HTML' });
        } else if (msg.video) {
          await bot.sendVideo(supportGroupId, msg.video.file_id, { caption: supportText, parse_mode: 'HTML' });
        } else if (msg.text) {
          await bot.sendMessage(supportGroupId, supportText, { parse_mode: 'HTML' });
        } else {
          await bot.forwardMessage(supportGroupId, chatId, msg.message_id);
        }
        console.log('✅ [SUPPORT] Fallback send success');
        fallbackMessage = '✅ Ваше сообщение отправлено в поддержку (альтернативный способ) 📤. Ответим скоро! 😊 Выберите опцию ниже: 👇';
      } catch (fallbackError) {
        console.error('❌ [SUPPORT] Fallback failed:', fallbackError.message);
        fallbackMessage += '\n(Внутренняя ошибка — напишите @admin)';
      }
      await bot.sendMessage(chatId, fallbackMessage, { reply_markup: getInlineKeyboard() });
      userStates.delete(chatId);
    });
};
const handleFallbackMessage = async (bot, msg, chatId, getInlineKeyboard, userId, username) => {
  const messageText = msg.text ? `Вы написали: "${msg.text}". ` : 'Получено сообщение (текст/медиа). ';
  console.log(`📨 [FALLBACK] ${messageText}от ${userId} (${username})`);
  await bot.sendMessage(
    chatId,
    `${messageText}Для запуска используй /start или выберите опцию ниже:`,
    { reply_markup: getInlineKeyboard() }
  );
};
module.exports = { handleNewMembers, handleSupportMode, handleFallbackMessage };