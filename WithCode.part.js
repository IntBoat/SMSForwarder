import {toEmoji} from 'emoji-clockface';

async function GPT(data = {}) {
    const response = await fetch("https://gpt.zedo.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer ghu_XkT2WQ5mPumqUFjahkvUO88WwXF9h63iRyzY"
        },
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });
    return response.json(); // parses JSON response into native JavaScript objects
}

// add silent emoji to message
const now = new Date();
const hour = now.getHours();
const isNightTime = hour >= 22 || hour < 7;
const SilentEmoji = isNightTime ? '🔕' : '';
let smsBody = global('SMSRB');
const mmsBody = global('MMSRS');
const digRe = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{5,}/gm;
let SMSRN = global('SMSRN');
if (SMSRN.indexOf("#") !== -1) {
    SMSRN = SMSRN.split("#")[1];
}
let senderName = ' (#' + SMSRN + ')';
const senderNameMatch = senderName.match(/\s?\(?#?\+?\d+\)?/g);
if (senderNameMatch && senderNameMatch[0].length > 0) {
    senderName = '';
}
const senderNumber = global('SMSRF').replace('+852', '');

GPT({
    "model": "gpt-4",
    "messages": [
        {
            "role": "system",
            "content": "以上信息是一個 SMS，將內容重新格式化，分別顯示發信人、消費店鋪、消費金額、驗證碼(數純字)，OTP及信用卡號。"
        },
        {
            "role": "user",
            "content": smsBody
        }
    ]
}).then((data) => {
    let gptBody;
    if (data.choices.length > 0) {
        gptBody = data.choices[0].message.content
    }

    setGlobal("TestMessage", gptBody);
    if (gptBody !== smsBody) {
        smsBody = gptBody;
    }

    let messageBody = (smsBody === '%SMSRB') ? (mmsBody === '%MMSRS') ? '無法獲取短訊內容' : mmsBody : smsBody;
    messageBody = messageBody.replace(digRe, function (match) {
        return '<code>' + match + '</code>';
    });

    setGlobal('Message', '✉ <b>' + senderNumber + senderName + '</b>\n' + toEmoji(global('SMSRT').split('.')[0], global('SMSRT').split('.')[1]) + ' ' + global('SMSRD') + ' ' + global('SMSRT').replace('.', ':') + ' ' + SilentEmoji + '\n\n' + messageBody);
})
    .then(r => exit());