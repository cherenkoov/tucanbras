// utils/telegramAuth.js
const crypto = require('crypto');

const validateTelegramInitData = (initData, botToken) => {
    try {
        const secret = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const [dataCheckString, hash] = initData.split('&hash=');

        if (!hash) return false;

        const computedHash = crypto
            .createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        return computedHash === hash;
    } catch (e) {
        console.error('validateTelegramInitData error:', e);
        return false;
    }
};

module.exports = { validateTelegramInitData };