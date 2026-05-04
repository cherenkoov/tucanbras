// bot/keyboards/keyboards.js (inline-клавиатура для пользователей)
const profileWebAppUrl = 'https://tucanbras.netlify.app';
const desktopAppUrl = 'https://tucanbras.netlify.app';  // Убрал /auth — по твоему запросу
const getInlineKeyboard = () => ({
  inline_keyboard: [
    [{ text: '👤 Профиль', web_app: { url: profileWebAppUrl } }],
    [{ text: '🆘 Поддержка', callback_data: 'support' }, { text: 'ℹ️ О нас', callback_data: 'about' }],
    [{ text: '📋 Мой аккаунт', callback_data: 'myinfo' }],
    [{ text: '💻 Компьютерная версия', callback_data: 'desktop_version' }],  // ← ИЗМЕНЕНО: callback вместо web_app
    [{ text: '🌐 Наш сайт', callback_data: 'site' }, { text: '📞 Наши контакты', callback_data: 'contacts' }],
    [{ text: '🧭 Как пользоваться ботом и приложением', callback_data: 'howto' }],
    [{ text: '❓ FAQ', callback_data: 'faq' }]
  ]
});
module.exports = { getInlineKeyboard };