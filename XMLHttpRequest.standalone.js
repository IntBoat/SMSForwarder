const apiKey = '_BOT_API_KEY_';
const chatID = '_CHAT_ID_';
const url = 'https://api.telegram.org/bot' + apiKey + '/sendMessage'; // The url to request
const obj = {
    chat_id: chatID,
    text: '發件人: ' + global('SMSRF') + '\n簡訊內容: ' + global('SMSRB')
};
const xht = new XMLHttpRequest();
xht.open('POST', url, true);
xht.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
xht.send(JSON.stringify(obj));