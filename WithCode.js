import {toEmoji} from 'emoji-clockface';
import TelegramAPI from './TelegramAPI.js';

const tg = new TelegramAPI(global('apiKey'), global('chatID'), 'api.telegram.org');
// add silent emoji to message
const SilentEmoji = tg.isNightTime ? '🔕' : '';
const smsBody = global('SMSRB');
const mmsBody = global('MMSRS');
const digRe = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{5,}/gm;

let senderName = ' #' + global('SMSRN') + ')';
if (senderName.match(/\s?\(?#?\+?\d+\)?/g)[0].length > 0) {
    senderName = '';
}
const senderNumber = global('SMSRF').replace('+852', '');

let messageBody = (smsBody === '%SMSRB') ? (mmsBody === '%MMSRS') ? '無法獲取短訊內容' : mmsBody : smsBody;
messageBody = messageBody.replace(digRe, function (match) {
    return '<code>' + match + '</code>';
});

const Message = '✉ <b>' + senderNumber + senderName + '</b>\n' + toEmoji(global('SMSRT').split('.')[0], global('SMSRT').split('.')[1]) + ' ' + global('SMSRD') + ' ' + global('SMSRT').replace('.', ':') + ' ' + SilentEmoji + '\n\n' + messageBody;
tg.sendMessage({
    text: Message,
    disable_web_page_preview: true,
    resultHandler: (result) => {
        if (result.ok) {
            flash('📩 信息已轉發。');
            return;
        }
        flash('📩 信息轉發錯誤：' + result.description);
    },
    errorHandler: (error) => flash('📩 信息轉發異常：' + error),
    exitHandler: exit
});