// bot/keyboards/group.js (обновлённый: + кнопка для /ankety в клавиатуре)
const getGroupKeyboard = () => ({
  keyboard: [
    ['📊 /stats', '📋 /ankety'], // ← ДОБАВЛЕНО: кнопка для анкет учителей
    ['ℹ️ /help'],
    ['📢 /broadcast', '❌ /cancel']
  ],
  resize_keyboard: true,
  one_time_keyboard: false
});
const getGroupCommands = () => `
🔧 <b>Доступные команды в менеджерской группе:</b>
📊 <code>/stats</code> или <code>/статистика</code> — Показать статистику пользователей (по ролям, даты регистрации, последние).
📋 <code>/ankety</code> или <code>/анкеты</code> — Список анкет учителей с кнопками просмотра. 👨‍🏫
📢 <code>/broadcast</code> — Рассылка анонса всем пользователям (с подтверждением и отменой). Поддерживает текст, фото и видео.
🔍 <code>/debug_id</code> — Получить ID чата и тип группы (для отладки .env).
ℹ️ <code>/help</code> — Показать этот список.
❌ <code>/cancel</code> — Отмена текущей операции (broadcast или support).
<b>Больше команд в разработке. Если нужно что-то добавить — напишите @admin.</b>
(Клавиатура с кнопками ниже — используйте для быстрого доступа!)
`.trim();
module.exports = { getGroupKeyboard, getGroupCommands };