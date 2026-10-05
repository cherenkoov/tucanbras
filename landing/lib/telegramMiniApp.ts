// Мини-апп Telegram, открытый не по тому адресу.
//
// Кнопки мини-аппа в BotFather (меню и «главное приложение») указывают на корень
// tucanbras.com — то есть на лендинг, а не на приложение (/app). Поменять их может
// только владелец бота. Распознаём открытие из Telegram здесь: Telegram дописывает
// к адресу фрагмент #tgWebAppData=…&tgWebAppVersion=… — у обычного посетителя его
// не бывает. Тогда сразу уводим в /app, сохраняя фрагмент: в нём подписанные данные
// пользователя, по которым приложение пускает без пароля.
//
// Строка, а не компонент: исполняется синхронно в <head>, до загрузки картинок
// и JS лендинга, — человек не видит лендинг даже на мгновение.
export const MINI_APP_PATH = '/app/'

export const TELEGRAM_MINI_APP_REDIRECT = `(function(l){try{var h=l.hash||'';if(/[#&]tgWebApp(Data|Version|Platform)=/.test(h)){l.replace('${MINI_APP_PATH}'+(l.search||'')+h)}}catch(e){}})(window.location)`
