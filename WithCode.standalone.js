/**
 * Tasker：SMS → AI（MarkdownV2）→ Telegram
 * 設定集中在檔案開頭 CFG；Tasker 可先宣告同名變數覆寫（見 mergeCfg）。
 * 建置：npm run build → dist/WithCode.standalone.min.js
 */
var CFG = {
    ai_api_key: '',
    ai_model: 'deepseek-chat',
    ai_base_url: 'https://api.deepseek.com/v1/chat/completions',
    ai_temperature: 0.2,
    api_key: '',
    chat_id: '',
    telegram_host: 'api.telegram.org',
    night_start_hour: 22,
    night_end_hour: 7,
    phone_strip_prefix: '+852',
    sms_placeholder: '%SMSRB',
    mms_placeholder: '%MMSRS',
    text_no_sms: '無法獲取短訊內容'
};

(function mergeCfg(base) {
    var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
    for (var k in base) {
        if (Object.prototype.hasOwnProperty.call(g, k) && g[k] !== undefined && g[k] !== null) {
            base[k] = g[k];
        }
    }
})(CFG);

/** @param {string} rt Tasker SMSRT，如 14.45 */
function toEmoji(rt) {
    var p = String(rt).split('.');
    var h = Number(p[0]) || 0;
    var m = Number(p[1]) || 0;
    var d = ~~(h % 12 * 2 + m / 30 + 0.5);
    d += d < 2 ? 24 : 0;
    return String.fromCharCode(55357, 56655 + (d + d % 2 * 23) / 2);
}

function stripFence(s) {
    s = String(s).trim();
    if (s.indexOf('```') !== 0) return s;
    var lines = s.split('\n');
    lines.shift();
    if (lines.length && lines[lines.length - 1].trim() === '```') lines.pop();
    return lines.join('\n').trim();
}

function escMv2(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function escMv2Code(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function normBackticks(s) {
    return String(s).replace(/[\u2018\u2019\u201a\u201b\u2032\u2035\uff07]/g, '`');
}

function escDecimalsOutsideCode(s) {
    var parts = String(s).split(/(`[^`]*`)/g);
    for (var i = 0; i < parts.length; i += 2) {
        parts[i] = parts[i].replace(/(\d+)\.(\d+)/g, function (_, a, b) {
            return a + '\\.' + b;
        });
    }
    return parts.join('');
}

var DIG_RE = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{5,}/gm;

var SYSTEM_PROMPT = [
    '你是短訊處理器。輸入為一則 SMS/MMS。請判斷類型、抽出簡訊內**所有重要資訊**，改寫為繁體中文（專有名詞與驗證碼數字保持正確）。',
    '只輸出一段「訊息本體」，且須為 Telegram MarkdownV2 合法字串；不得含發送者、標題、日期時間、前言或結語；禁止 HTML；勿用 ``` 包住全文。',
    '',
    '【版面】',
    '第 1 行僅一行：*【類型】*（全形直角括號）。類型擇一或複合：廣告、驗證碼、OTP、通知、財務交易、物流、預約、系統、其他。',
    '第 2 段起：每行以「• 」（Unicode 項目符號 + 半形空格）條列。**任何類型**都應盡量條列讀完即能掌握全意的重點（單號、時間點、取貨／授權說明、連結提示、注意事項等）；可自訂「• 標籤：內容」，不要遺漏明顯要項。',
    '常見欄位（有則寫，無則整行省略；勿用「無／未註明」填空，但「來源」完全無線索時可寫 未註明）：',
    '• 來源：發送方／品牌／App／網站等',
    '• 商戶：僅當類型含**財務交易**且簡訊載有店名、收款方、消費地點、平台賣家等（有則必列）',
    '• OTP：僅當有驗證碼／動態密碼；碼本身用半形反引號包住，例如 ' + '`980832`',
    '• 金額：有交易金額時；建議整段放反引號，例如 ' + '`HKD 100.00`' + '（避免小數點觸發 MV2）',
    '• 有效期：僅當原文**明文**寫出截止、幾分鐘內有效等；未提及則不要出現有效期相關行',
    '廣告／促銷：最醒目的一句或關鍵優惠可再用 *…* 加粗。',
    '',
    '若條列後仍有長段正文無法濃縮成點列：空一行，單獨一行 *內容*，其下用繁中短敘補足（勿重複已列重點）。若無此必要則省略 *內容*。',
    '',
    '【MarkdownV2】粗體 *…*。一般文字裡若字面出現 _ * [ ] ( ) ~ ` > # + - = | { } . ! 須在該字元前加反斜線；全形標點多半不必。OTP／金額優先用成對 `…` 行內 code；勿在反引號外多餘寫成 \\`123\\`。'
].join('\n');

function callAi(text) {
    return fetch(String(CFG.ai_base_url).trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.ai_api_key },
        body: JSON.stringify({
            model: CFG.ai_model,
            temperature: CFG.ai_temperature,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: String(text) }
            ]
        })
    }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
        return r.json();
    }).then(function (d) {
        var c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (!c || !String(c).trim()) throw new Error('AI 回應無效');
        return stripFence(c);
    });
}

function sendTg(text, mode, done) {
    var body = {
        chat_id: CFG.chat_id,
        text: text,
        disable_web_page_preview: true,
        disable_notification: isNight
    };
    if (mode) body.parse_mode = mode;
    fetch('https://' + CFG.telegram_host + '/bot' + CFG.api_key + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (res) {
        if (res.ok) {
            flash('📩 信息已轉發。');
            if (done) done(true);
            return;
        }
        var desc = res.description || '';
        if (mode === 'MarkdownV2' && /parse|entities/i.test(desc)) {
            flash('📩 MarkdownV2 解析失敗，改以純文字重送。');
            sendTg(text, null, done);
            return;
        }
        flash('📩 信息轉發錯誤：' + desc);
        if (done) done(false);
    }).catch(function (e) {
        flash('📩 信息轉發異常：' + e);
        if (done) done(false);
    });
}

function sendBody(mv2) {
    var body = escDecimalsOutsideCode(normBackticks(String(mv2).replace(/^\n+/, '')));
    sendTg(header + body, 'MarkdownV2', function () {
        if (typeof exit !== 'undefined') exit();
    });
}

function fallbackBody(raw) {
    return escMv2(raw).replace(DIG_RE, function (m) {
        return '`' + escMv2Code(m) + '`';
    });
}

var h = new Date().getHours();
var isNight = h >= CFG.night_start_hour || h < CFG.night_end_hour;
var silent = isNight ? '🔕' : '';

var smsBody = global('SMSRB');
var mmsBody = global('MMSRS');
var rn = global('SMSRN');
if (rn.indexOf('#') !== -1) rn = rn.split('#')[1];
var nameSuffix = ' (#' + rn + ')';
var nameMatch = nameSuffix.match(/\s?\(?#?\+?\d+\)?/g);
if (nameMatch && nameMatch[0].length) nameSuffix = '';

var resolved = smsBody === CFG.sms_placeholder ? (mmsBody === CFG.mms_placeholder ? CFG.text_no_sms : mmsBody) : smsBody;

var header =
    '*' + escMv2('✉ ' + global('SMSRF').replace(CFG.phone_strip_prefix, '') + nameSuffix) + '*\n' +
    escMv2(toEmoji(global('SMSRT')) + ' ' + global('SMSRD') + ' ' +
        global('SMSRT').replace('.', ':') + ' ' + silent) + '\n\n';

if (resolved === CFG.text_no_sms) {
    sendBody(fallbackBody(resolved));
} else {
    callAi(resolved).then(sendBody).catch(function (err) {
        var m = err && err.message ? err.message : String(err);
        flash('AI 處理失敗（已改用後備格式）：' + (m.length > 180 ? m.slice(0, 180) + '…' : m));
        sendBody(fallbackBody(resolved));
    });
}
