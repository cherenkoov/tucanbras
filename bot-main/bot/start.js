// bot/start.js (обновлённый: + поддержка broadcast_ready_for_input для выбора аудитории)
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const models = require('../models/index'); // Относительно корня
const { User, TeacherAnketa } = models; // ← ДОБАВЛЕНО: TeacherAnketa для анкет
const { Op } = require('sequelize');
const token = process.env.BOT_TOKEN;
const supportGroupId = process.env.SUPPORT_GROUP_ID;
if (!token) {
  console.error('BOT_TOKEN не найден в .env!');
  return;
}
if (!supportGroupId) {
  console.error('SUPPORT_GROUP_ID не найден в .env! Добавь: SUPPORT_GROUP_ID=-100xxxxxxxxxx');
  return;
}
// URL для Web App
const profileWebAppUrl = 'https://tucanbras.netlify.app';
const desktopAppUrl = 'https://tucanbras.netlify.app/auth';
// File IDs для стикеров
const animStickerFileId = 'CAACAgIAAxkDAAICu2kJR3qO8wG1lMHOWB0sUeJlD9uhAAJciQAC_HlJSOqezecZTxDYNgQ';
const supportStickerFileId = 'CAACAgIAAxkBAmtqu2kKHIBDs_-h_R9IAujVDfZEnvwjAAJFAANZu_wl-9SkNOET-Os2BA';
const bot = new TelegramBot(token, {
  polling: true,
  request: { dropPendingUpdates: true }
});
// Map для состояний пользователей
const userStates = new Map();
// Импорты подкомпонентов
const { getInlineKeyboard } = require('./keyboards/keyboards');
const { getGroupKeyboard, getGroupCommands } = require('./keyboards/group');
const { escapeHtml } = require('./utils/helpers');
// Регистрация handlers (импорт и вызов)
const { registerUserCommands } = require('./handlers/userCommands');
const { registerAdminCommands } = require('./handlers/adminCommands');
const { handleNewMembers, handleSupportMode, handleFallbackMessage } = require('./handlers/supportHandlers'); // ← ФИКС: правильный импорт функций
const { handleCallbacks } = require('./handlers/callbackHandlers');
const { handleBroadcastInput } = require('./handlers/broadcastInput');
// ← ФИКС: Регистрация onText handlers ПЕРЕД bot.on('message') — чтобы команды не игнорировались
registerUserCommands(bot, supportGroupId, getInlineKeyboard, animStickerFileId, userStates);
registerAdminCommands(bot, supportGroupId, userStates, User, TeacherAnketa, Op, getGroupKeyboard, getGroupCommands, getInlineKeyboard); // ← ФИКС: передача TeacherAnketa и getInlineKeyboard
// Глобальный on('message') — объединяет welcome + state checks + fallback
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name || 'Unknown';
  console.log(`📨 Message received: chatId=${chatId} (type:${typeof chatId}), text="${msg.text || 'non-text'}", from=${userId} (${username})`);
  // Welcome для новых в группе
  if (chatId.toString() === supportGroupId && msg.new_chat_members && msg.new_chat_members.length > 0) {
    await handleNewMembers(bot, msg, supportGroupId, getGroupKeyboard, getGroupCommands, escapeHtml);
  }
  // State checks (support_mode)
  if (userStates.has(chatId) && userStates.get(chatId) === 'support_mode') {
    await handleSupportMode(bot, msg, chatId, supportGroupId, userStates, getInlineKeyboard, userId, username); // ← ФИКС: правильный вызов handleSupportMode
    return;
  }
  // ← ФИКС: Игнор команд (onText обработают отдельно) — улучшенный regex для prefixed команд (с эмодзи)
  if (msg.text && (msg.text.startsWith('/') || msg.text.match(/\/\w+$/))) {
    console.log(`⚠️ [MSG] Ignoring potential command "${msg.text}" (handled by onText)`);
    return;
  }
  // Broadcast mode (только в группе) — ← ФИКС: + поддержка 'broadcast_ready_for_input' для ввода после выбора аудитории
  if (chatId.toString() === supportGroupId && userStates.has(chatId) && (userStates.get(chatId) === 'broadcast_confirm' || userStates.get(chatId) === 'broadcast_ready_for_input')) {
    await handleBroadcastInput(bot, msg, chatId, userStates, User, Op, getGroupKeyboard);
    return;
  }
  // Игнор non-command в группе (если не в state)
  if (chatId.toString() === supportGroupId) {
    console.log(`⚠️ [MSG] Ignoring non-command from group ${chatId} (no active state)`);
    return;
  }
  // Fallback
  await handleFallbackMessage(bot, msg, chatId, getInlineKeyboard, userId, username);
});
// Callback queries
bot.on('callback_query', async (query) => {
  await handleCallbacks(bot, query, userStates, User, TeacherAnketa, Op, getInlineKeyboard, getGroupKeyboard, supportGroupId, animStickerFileId, supportStickerFileId, path, fs); // ← ФИКС: передача TeacherAnketa
});
// Ошибки
bot.on('error', (error) => console.error('Ошибка бота:', error));
console.log('Бот запущен! Проверь логи для broadcast-debug. Support Group: ' + supportGroupId);
console.log('🆕 Обновление: /broadcast теперь поддерживает фото и видео!');
const startBot = () => bot; // Возвращаем bot для тестов (опционально)
module.exports = { startBot };