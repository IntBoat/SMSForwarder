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

function time2emoji(t) {
    let d=~~(t.split('.')[0]%12*2+t.split('.')[1]/30+.5);d+=d<2?24:0;
    return String.fromCharCode(55357,56655+(d+d%2*23)/2);
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