// bot/handlers/broadcastInput.js (обновлённая: + фильтрация по audience в preview)
const { Op } = require('sequelize');
const { getGroupKeyboard } = require('../keyboards/group');

const handleBroadcastInput = async (bot, msg, chatId, userStates, User, Op, getGroupKeyboard) => {
  console.log(`✅ [BROADCAST] Processing message in confirm state for ${chatId}`);
  let broadcastText = (msg.caption || msg.text || '').trim();
  let media = null;
  if (msg.photo) {
    media = { type: 'photo', fileId: msg.photo[msg.photo.length - 1].file_id };
    console.log(`✅ [BROADCAST] Photo detected: fileId=${media.fileId}`);
  } else if (msg.video) {
    media = { type: 'video', fileId: msg.video.file_id };
    console.log(`✅ [BROADCAST] Video detected: fileId=${media.fileId}`);
  }
  if (!media && (!broadcastText || broadcastText.length < 3)) {
    console.log(`⚠️ [BROADCAST] Invalid text "${broadcastText}" (too short, no media), reprompt for ${chatId}`);
    const warnText = `⚠️ Введите валидный текст для рассылки (минимум 3 символа) или отправьте фото/видео. Или /cancel.\n\n(Пример: "Привет, новое обновление!")`;
    await bot.sendMessage(chatId, warnText, { reply_markup: getGroupKeyboard() });
    await bot.sendMessage(chatId, 'Отправьте сообщение для рассылки ниже:', { reply_markup: getGroupKeyboard() });
    return;
  }

  const audience = userStates.get(`${chatId}_audience`) || 'all'; // ← НОВОЕ: используем выбранную аудиторию
  let whereClause = { telegramId: { [Op.ne]: null } };
  if (audience === 'students') {
    whereClause.role = { [Op.in]: ['USER'] };
  } else if (audience === 'teachers') {
    whereClause.role = { [Op.in]: ['TEACHER'] };
  }
  const eligibleCount = await User.count({ where: whereClause });

  userStates.set(chatId, 'broadcast_ready');
  userStates.set(`${chatId}_broadcast_text`, broadcastText);
  if (media) userStates.set(`${chatId}_broadcast_media`, media);
  console.log(`✅ [BROADCAST] Valid input: text="${broadcastText}", media=${JSON.stringify(media)}, audience=${audience}, set to 'broadcast_ready' for ${chatId}`);

  const audienceLabel = audience === 'all' ? 'всем' : audience === 'students' ? 'ученикам' : 'преподавателям';
  const previewText = broadcastText ? `📢 **Предпросмотр рассылки (${audienceLabel}):**\n\n${broadcastText}` : `📢 **Предпросмотр рассылки (${audienceLabel}):**\n\n(Только медиа без текста)`;
  const previewCaption = `Отправить ${eligibleCount} пользователям?`;

  const previewKeyboard = {
    inline_keyboard: [
      [{ text: '✅ Да, отправить', callback_data: 'broadcast_send' }],
      [{ text: '❌ Отмена', callback_data: 'broadcast_cancel' }]
    ]
  };
  try {
    if (media) {
      if (media.type === 'photo') {
        await bot.sendPhoto(chatId, media.fileId, { caption: previewText + '\n\n' + previewCaption, parse_mode: 'Markdown', reply_markup: previewKeyboard });
      } else if (media.type === 'video') {
        await bot.sendVideo(chatId, media.fileId, { caption: previewText + '\n\n' + previewCaption, parse_mode: 'Markdown', reply_markup: previewKeyboard });
      }
    } else {
      await bot.sendMessage(chatId, previewText + '\n\n' + previewCaption, { parse_mode: 'Markdown', reply_markup: previewKeyboard });
    }
    console.log(`✅ [BROADCAST] Preview sent for text="${broadcastText}", media=${JSON.stringify(media)}, audience=${audience} (${eligibleCount}), state: 'broadcast_ready' для ${chatId}`);
  } catch (previewErr) {
    console.error('❌ [BROADCAST] Preview send error:', previewErr);
    await bot.sendMessage(chatId, '❌ Ошибка предпросмотра. Попробуйте заново /broadcast.', { reply_markup: getGroupKeyboard() });
    userStates.delete(chatId);
  }
};

module.exports = { handleBroadcastInput };