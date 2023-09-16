// function global(param) {
//     if (param === "SMSRN") return "+85212345678";
//     if (param === "SMSRF") return "神奇的小天使";
//     if (param === "SMSRD") return "9-16-21";
//     if (param === "SMART") return "14.45";
//     if (param === "SMS-RB") return "您的登錄驗證碼是 6666，請於30分鐘內填寫。如非本人操作，請試試123456。 或者試試ABC-12345678，也可以是 PRE-5367-3556 或者1234-5678或者ABC-123456";
// }
//
// function exit() {
//     console.info("test");
// }

let apiKey = "_BOT_API_KEY_";
let chatID = "_CHAT_ID_";
let apiUrl = "api.telegram.org";

const clockFaces = [{
    face: '🕛',
    time: ['12:00', '00:00']
},
    {
        face: '🕧',
        time: ['12:30', '00:30']
    },
    {
        face: '🕐',
        time: ['13:00', '01:00']
    },
    {
        face: '🕜',
        time: ['13:30', '01:30']
    },
    {
        face: '🕑',
        time: ['14:00', '02:00']
    },
    {
        face: '🕝',
        time: ['14:30', '02:30']
    },
    {
        face: '🕒',
        time: ['15:00', '03:00']
    },
    {
        face: '🕞',
        time: ['15:30', '03:30']
    },
    {
        face: '🕓',
        time: ['16:00', '04:00']
    },
    {
        face: '🕟',
        time: ['16:30', '04:30']
    },
    {
        face: '🕔',
        time: ['17:00', '05:00']
    },
    {
        face: '🕠',
        time: ['17:30', '05:30']
    },
    {
        face: '🕕',
        time: ['18:00', '06:00']
    },
    {
        face: '🕡',
        time: ['18:30', '06:30']
    },
    {
        face: '🕖',
        time: ['19:00', '07:00']
    },
    {
        face: '🕢',
        time: ['19:30', '07:30']
    },
    {
        face: '🕗',
        time: ['20:00', '08:00']
    },
    {
        face: '🕣',
        time: ['20:30', '08:30']
    },
    {
        face: '🕘',
        time: ['21:00', '09:00']
    },
    {
        face: '🕤',
        time: ['21:30', '09:30']
    },
    {
        face: '🕙',
        time: ['22:00', '10:00']
    },
    {
        face: '🕥',
        time: ['22:30', '10:30']
    },
    {
        face: '🕚',
        time: ['23:00', '11:00']
    },
    {
        face: '🕦',
        time: ['23:30', '11:30']
    }
]

function time2emoji(t) {
    const hour = parseInt(t.split('.')[0]);
    const minutes = parseInt(t.split('.')[0]);
    return clockFaces.find((element) => {
        return element.time.find((time) => {
            const minute = parseInt(time.split(':')[1]);
            return ((minute === 30 && (minutes >= 15 && minutes <= 45)) || (minute === 0 && (minutes < 15 || minutes > 45))) && t.split('.')[0] === time.split(':')[0];
        });
    }).face;
}

let senderName = global('SMSRN').replace("+852", "");
const re = /\d*/g;
if (senderName.match(re)[0].length > 0) {
    senderName = "";
}

let SMSRB = global('SMSRB');
let MMSRS = global('MMSRS');
let messageBody = (SMSRB === "%SMSRB") ? (MMSRS === "%MMSRS") ? "無法獲取短訊內容" : MMSRS : SMSRB;
const digRe = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{4,}/gm;
messageBody = messageBody.replace(digRe, function (match) {
    return `<code>${match}</code>`;
});

const Message = `✉ <b>${global('SMSRF')} ${(senderName !== "") ? "(#" + (senderName) + ")" : ""}</b>\n${time2emoji(global('SMSRT'))} ${global('SMSRD')} ${global('SMSRT').replace('.', ':')}\n\n${messageBody}`;

let myHeaders = new Headers();
myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

let urlencoded = new URLSearchParams();
urlencoded.append("chat_id", chatID);
urlencoded.append("text", Message);
urlencoded.append("parse_mode", "HTML");

let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: urlencoded,
    redirect: 'follow'
};

fetch(`https://${apiUrl}/bot${apiKey}/sendMessage`, requestOptions)
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error))
    .then(() => exit());