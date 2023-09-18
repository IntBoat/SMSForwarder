import {toEmoji} from "emoji-clockface";

let apiKey = "_BOT_API_KEY_";
let chatID = "_CHAT_ID_";
let apiUrl = "api.telegram.org";

let senderName = global('SMSRN').replace("+852", "");
const re = /\d*/g;
if (senderName.match(re)[0].length > 0) {
    senderName = "";
}
const now = new Date();
const hour = now.getHours();
const isNightTime = hour >= 22 || hour < 7;
let SilentEmoji = "";
if (isNightTime) {
    // add silent emoji to message
    SilentEmoji = "🔕";
}

const SMSRB = global('SMSRB');
const MMSRS = global('MMSRS');
let messageBody = (SMSRB === "%SMSRB") ? (MMSRS === "%MMSRS") ? "無法獲取短訊內容" : MMSRS : SMSRB;
const digRe = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{4,}/gm;
messageBody = messageBody.replace(digRe, function (match) {
    return `<code>${match}</code>`;
});

const Message = `✉ <b>${global('SMSRF')} ${(senderName !== "") ? "(#" + (senderName) + ")" : ""}</b>\n${toEmoji(global('SMSRT').split('.')[0], global('SMSRT').split('.')[1])} ${global('SMSRD')} ${global('SMSRT').replace('.', ':')} ${SilentEmoji}\n\n${messageBody}`;

let myHeaders = new Headers();
myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

let urlencoded = new URLSearchParams();
urlencoded.append("chat_id", chatID);
urlencoded.append("text", Message);
urlencoded.append("parse_mode", "HTML");
urlencoded.append("disable_web_page_preview", "true");
urlencoded.append("protect_content", "true");

// set disable_notification to true if time is between 22:00 and 07:00
if (isNightTime) {
    urlencoded.append("disable_notification", "true");
}

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