// bot/utils/helpers.js (утилиты, включая escapeHtml)
const escapeHtml = (text) => {
  if (!text) return 'Новый менеджер';
  return text.replace(/[&<>"']/g, (match) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[match]);
};

module.exports = { escapeHtml };