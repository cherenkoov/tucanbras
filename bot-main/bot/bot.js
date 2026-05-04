// bot.js (исправлено: webAppUrl без /api; улучшены логи и env-check)
require('dotenv').config(); // .env в корне

const TelegramBot = require('node-telegram-bot-api');

// Токен из .env (без fallback — обязательно!)
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN не найден в .env! Добавь в .env: BOT_TOKEN=твой_токен');
  process.exit(1);
}

// URL Web App (ngrok для фронта — корень, не /api!)
const webAppUrl = 'https://tucanbras.netlify.app';  // ← Фронт на /

const bot = new TelegramBot(token, { polling: true });

// Обработчик /start — с кнопкой Web App
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`Получен /start от user ${msg.from.id} (${msg.from.username || 'no username'})`);  // Лог для дебага
  bot.sendMessage(
    chatId,
    'Добро пожаловать в TucanBras! Нажми кнопку ниже, чтобы открыть приложение.',
    {
      reply_markup: {
        inline_keyboard: [
          [{
            text: 'Открыть приложение',  // ← Кнопка для WebApp
            web_app: { url: webAppUrl }
          }]
        ]
      }
    }
  );
});

// Обработчик /profile (fallback)
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Профиль доступен в приложении! Используй /start для запуска.');
});

// Fallback для других сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && !msg.text.startsWith('/')) {
    console.log(`Сообщение от ${msg.from.id}: ${msg.text}`);  // Лог
    bot.sendMessage(chatId, `Вы написали: ${msg.text}. Для запуска используй /start.`);
  }
});

// Обработчик callback_query (если кнопка inline)
bot.on('callback_query', (query) => {
  console.log(`Callback от ${query.from.id}: ${query.data}`);  // Лог
  bot.answerCallbackQuery(query.id);
});

// Ошибки
bot.on('error', (error) => {
  console.error('Ошибка бота:', error);
});

console.log('Бот запущен с Web App поддержкой!');
console.log(`WebApp URL: ${webAppUrl}`);  // Лог для дебага
console.log(`Bot Token: ${token.substring(0, 10)}...`);  // Частичный лог токена