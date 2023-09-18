// function global(param) {
//     if (param === 'SMSRN') return '+85212345678';
//     if (param === 'SMSRF') return '神奇的小天使';
//     if (param === 'SMSRD') return '9-16-21';
//     if (param === 'SMSRT') return '14.45';
//     if (param === 'SMSRB') return '您的登錄驗證碼是 6666，請於30分鐘內填寫。如非本人操作，請試試123456。 或者試試ABC-12345678，也可以是 PRE-5367-3556 或者1234-5678或者ABC-123456';
//     if (param === 'MMSRS') return '%MMSRS';
// }
//
// function exit() {
//     console.info('Exiting...');
// }
//
// function flash(message) {
//     console.log(message);
// }

function toEmoji(t) {
    let d = ~~(t.split('.')[0] % 12 * 2 + t.split('.')[1] / 30 + 0.5);
    d += d < 2 ? 24 : 0;
    return String.fromCharCode(55357, 56655 + (d + d % 2 * 23) / 2);
}
if (typeof api_key === 'undefined') {
    var api_key = '_BOT_API_KEY_';
}
if (typeof chat_id === 'undefined') {
    var chat_id = '_CHAT_ID_';
}
const api_url = 'api.telegram.org';

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