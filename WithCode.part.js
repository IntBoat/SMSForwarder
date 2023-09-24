import {toEmoji} from 'emoji-clockface';

// add silent emoji to message
const now = new Date();
const hour = now.getHours();
const isNightTime = hour >= 22 || hour < 7;
const SilentEmoji = isNightTime ? '🔕' : '';
const smsBody = global('SMSRB');
const mmsBody = global('MMSRS');
const digRe = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{5,}/gm;

let senderName = ' (#' + global('SMSRN') + ')';
const senderNameMatch = senderName.match(/\s?\(?#?\+?\d+\)?/g);
if (senderNameMatch && senderNameMatch[0].length > 0) {
    senderName = '';
}
const senderNumber = global('SMSRF').replace('+852', '');

let messageBody = (smsBody === '%SMSRB') ? (mmsBody === '%MMSRS') ? '無法獲取短訊內容' : mmsBody : smsBody;
messageBody = messageBody.replace(digRe, function (match) {
    return '<code>' + match + '</code>';
});

setGlobal('Message', '✉ <b>' + senderNumber + senderName + '</b>\n' + toEmoji(global('SMSRT').split('.')[0], global('SMSRT').split('.')[1]) + ' ' + global('SMSRD') + ' ' + global('SMSRT').replace('.', ':') + ' ' + SilentEmoji + '\n\n' + messageBody);
