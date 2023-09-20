import TelegramAPI from './TelegramAPI.js';

const tg = new TelegramAPI(global('apiKey'), global('chatID'), 'api.telegram.org');
tg.sendMessage({
    text: global('Message'),
});