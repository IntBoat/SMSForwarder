import {toEmoji} from 'emoji-clockface';

let api_key = '_BOT_API_KEY_';
let chat_id = '_CHAT_ID_';
let api_url = 'api.telegram.org';

const re = /\d*/g;
const now = new Date();
const hour = now.getHours();
const isNightTime = hour >= 22 || hour < 7;
// add silent emoji to message
const SilentEmoji = isNightTime ? '🔕' : '';
const smsBody = global('SMSRB');
const mmsBody = global('MMSRS');
const digRe = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{4,}/gm;

let senderName = global('SMSRN').replace('+852', '');
if (senderName.match(re)[0].length > 0) {
    senderName = '';
}

let messageBody = (smsBody === '%SMSRB') ? (mmsBody === '%MMSRS') ? '無法獲取短訊內容' : mmsBody : smsBody;
messageBody = messageBody.replace(digRe, function (match) {
    return '<code>' + match + '</code>';
});

// const Message = `✉ <b>${global('SMSRF')} ${(senderName !== "") ? '(#' + (senderName) + ')' : ''}</b>\n${toEmoji(global('SMSRT').split('.')[0], global('SMSRT').split('.')[1])} ${global('SMSRD')} ${global('SMSRT').replace('.', ':')} ${SilentEmoji}\n\n${messageBody}`;
const Message = '✉ <b>' + global('SMSRF') + ' ' + ((senderName !== '') ? '(#' + senderName + ')' : '') + '</b>\n' + toEmoji(global('SMSRT').split('.')[0], global('SMSRT').split('.')[1]) + ' ' + global('SMSRD') + ' ' + global('SMSRT').replace('.', ':') + ' ' + SilentEmoji + '\n\n' + messageBody;
const requestOptions = {
    method: 'POST',
    headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded'
    }),
    body: new URLSearchParams({
        chat_id: chat_id,
        text: Message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        protect_content: true,
        // set disable_notification to true if time is between 22:00 and 07:00
        disable_notification: isNightTime
    }),
    redirect: 'follow'
};

fetch('https://' + api_url + '/bot' + api_key + '/sendMessage', requestOptions)
    .then(response => response.json())
    .then(result => {
        if (result.ok) {
            flash('📩 信息已轉發。');
        } else {
            flash('📩 信息轉發錯誤：' + result.description);
        }
    })
    .catch(error => {
        flash('📩 信息轉發異常：' + error);
    })
    .then(() => exit());