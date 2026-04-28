/**
 * Tasker：SMS → AI（MarkdownV2）→ Telegram
 * 設定集中在檔案開頭 CFG；Tasker 可先宣告同名變數覆寫（見 mergeCfg）。
 * 建置：npm run build → dist/WithCode.standalone.min.js
 */
var CFG = {
    ai_api_key: '',
    ai_model: 'deepseek-v4-flash',
    ai_base_url: 'https://api.deepseek.com/v1/chat/completions',
    ai_temperature: 0.1,
    api_key: '',
    chat_id: '',
    telegram_host: 'api.telegram.org',
    night_start_hour: 22,
    night_end_hour: 7,
    phone_strip_prefix: '+852',
    sms_placeholder: '%SMSRB',
    mms_placeholder: '%MMSRS',
    text_no_sms: '無法獲取短訊內容',
    /** 偵測到驗證碼／OTP 時是否寫入系統剪貼簿（Tasker 內建 setClip） */
    copy_otp: true,
    /** 複製成功時是否 flash 提示（不影響錯誤提示） */
    copy_otp_flash: false,
    /**
     * 傳給 Chat Completions 的 tool_choice；設為 null 代表省略（由模型自行決定）。
     * deepseek-v4-flash 若不支援特定 tool_choice，可維持 null 以確保請求成功。
     */
    ai_tool_choice: null
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

var DIG_RE = /(\d+-\d+-\d+)|(\d{3,}-\d{3,})|\d{5,}/gm;

/** 抽出 `` `inline` ``，以佔位符替換（避免與粗體 * 解析互相干擾） */
function extractInlineCodes(s) {
    var codes = [];
    var out = '';
    var i = 0;
    while (i < s.length) {
        if (s.charAt(i) === '`') {
            var j = i + 1;
            var inner = '';
            while (j < s.length) {
                var cj = s.charAt(j);
                if (cj === '`') break;
                if (cj === '\\' && j + 1 < s.length) {
                    inner += cj + s.charAt(j + 1);
                    j += 2;
                    continue;
                }
                inner += cj;
                j++;
            }
            if (j < s.length) {
                codes.push(inner);
                out += '\uE000' + String.fromCharCode(0xE100 + codes.length - 1) + '\uE001';
                i = j + 1;
                continue;
            }
        }
        out += s.charAt(i);
        i++;
    }
    return { text: out, codes: codes };
}

/** 自 start 起找下一個未跳脫的結束 *（粗體邊界） */
function findClosingBoldStar(s, start) {
    var i = start;
    while (i < s.length) {
        var c = s.charAt(i);
        if (c === '\\' && i + 1 < s.length) {
            i += 2;
            continue;
        }
        if (c === '*') return i;
        i++;
    }
    return -1;
}

var PLACEHOLDER_RE = /\uE000([\uE100-\uE1FF])\uE001/g;

/** 將一段文字中的併位符還原為 MV2 行內 code，其餘字元全面 escMv2 */
function processPlainWithCodePlaceholders(segment, codes) {
    var result = '';
    var last = 0;
    var m;
    PLACEHOLDER_RE.lastIndex = 0;
    while ((m = PLACEHOLDER_RE.exec(segment)) !== null) {
        result += escMv2(segment.slice(last, m.index));
        var idx = m[1].charCodeAt(0) - 0xE100;
        var inner = codes[idx] != null ? codes[idx] : '';
        result += '`' + escMv2Code(inner) + '`';
        last = PLACEHOLDER_RE.lastIndex;
    }
    result += escMv2(segment.slice(last));
    return result;
}

/**
 * 工具回傳的 message_body 未必完全符合 MV2；在保留 *粗體* 與 `` `code` `` 的前提下
 * 對其餘字元做 Telegram 要求的跳脫，避免 sendMessage 因 parse 失敗而退回純文字。
 */
function sanitizeToolBodyForMarkdownV2(raw) {
    raw = normBackticks(String(raw).replace(/^\n+/, ''));
    var ex = extractInlineCodes(raw);
    var s = ex.text;
    var codes = ex.codes;
    var out = '';
    var i = 0;
    while (i < s.length) {
        var star = s.indexOf('*', i);
        if (star === -1) {
            out += processPlainWithCodePlaceholders(s.slice(i), codes);
            break;
        }
        if (star > i) {
            out += processPlainWithCodePlaceholders(s.slice(i, star), codes);
        }
        // 現在位於 '*'；若找不到合法結束 '*'，就當作一般字元跳脫
        var close = findClosingBoldStar(s, star + 1);
        if (close !== -1 && close > star + 1) {
            out += '*' + processPlainWithCodePlaceholders(s.slice(star + 1, close), codes) + '*';
            i = close + 1;
        } else {
            out += escMv2('*');
            i = star + 1;
        }
    }
    return out;
}

/** 與下方 tools 定義一致；訊息本體僅能經由此工具提交 */
var SMS_FORWARD_TOOL_NAME = 'submit_sms_forward_body';

var SYSTEM_PROMPT = [
    '你是短訊處理器。輸入為一則 SMS/MMS。請判斷類型、抽出簡訊內**所有重要資訊**，改寫為繁體中文（專有名詞與驗證碼數字保持正確）。',
    '請直接在 assistant 的 `content` 輸出完整轉發訊息本體。',
    '輸出內容須為 Telegram MarkdownV2 合法字串；不得含發送者、標題、日期時間、前言或結語；禁止 HTML；勿用 ``` 包住全文。',
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

/** @param {object} choice message 物件 */
function extractBodyFromToolCalls(choice) {
    var tc = choice.tool_calls;
    var i, t, fn, rawArgs, obj, body;
    if (tc && tc.length) {
        for (i = 0; i < tc.length; i++) {
            t = tc[i];
            if (!t || t.type !== 'function') continue;
            fn = t.function;
            if (!fn || fn.name !== SMS_FORWARD_TOOL_NAME) continue;
            rawArgs = fn.arguments != null ? fn.arguments : '{}';
            try {
                obj = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
            } catch (e) {
                throw new Error('工具參數 JSON 無法解析');
            }
            if (!obj || typeof obj.message_body !== 'string') throw new Error('工具缺少 message_body');
            body = stripFence(obj.message_body);
            if (!String(body).trim()) throw new Error('工具 message_body 為空');
            return body;
        }
    }
    if (choice.function_call && choice.function_call.name === SMS_FORWARD_TOOL_NAME) {
        rawArgs = choice.function_call.arguments != null ? choice.function_call.arguments : '{}';
        try {
            obj = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
        } catch (e2) {
            throw new Error('工具參數 JSON 無法解析');
        }
        if (!obj || typeof obj.message_body !== 'string') throw new Error('工具缺少 message_body');
        body = stripFence(obj.message_body);
        if (!String(body).trim()) throw new Error('工具 message_body 為空');
        return body;
    }
    return null;
}

/** @param {object} d chat completion JSON */
function extractMessageFromAiResponse(d) {
    var choice = d && d.choices && d.choices[0] && d.choices[0].message;
    if (!choice) throw new Error('AI 回應無效');
    var fromTool = extractBodyFromToolCalls(choice);
    if (fromTool != null) return fromTool;
    var content = choice.content;
    if (content != null && String(content).trim()) {
        return stripFence(String(content));
    }
    throw new Error('AI 回應缺少可用內容');
}

function callAi(text) {
    var payload = {
        model: CFG.ai_model,
        temperature: CFG.ai_temperature,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: String(text) }
        ]
    };
    if (CFG.ai_tool_choice != null && CFG.ai_tool_choice !== '') {
        payload.tool_choice = CFG.ai_tool_choice;
    }
    return fetch(String(CFG.ai_base_url).trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.ai_api_key },
        body: JSON.stringify(payload)
    }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
        return r.json();
    }).then(function (d) {
        return extractMessageFromAiResponse(d);
    });
}

function sendTg(text, mode, done, quiet) {
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
            if (!quiet) flash('📩 信息已轉發。');
            if (done) done(true);
            return;
        }
        var desc = res.description || '';
        if (mode === 'MarkdownV2' && /parse|entities/i.test(desc)) {
            if (!quiet) flash('📩 MarkdownV2 解析失敗，改以純文字重送。');
            sendTg(text, null, done, quiet);
            return;
        }
        if (!quiet) flash('📩 信息轉發錯誤：' + desc);
        if (done) done(false);
    }).catch(function (e) {
        if (!quiet) flash('📩 信息轉發異常：' + e);
        if (done) done(false);
    });
}

function compactOneLine(s) {
    return String(s).replace(/\s+/g, ' ').trim();
}

function sendAiErrorToTg(errMsg) {
    var oneLine = compactOneLine(errMsg || '未知錯誤');
    var clipped = oneLine.length > 300 ? oneLine.slice(0, 300) + '…' : oneLine;
    sendTg('⚠️ AI 處理失敗：' + clipped, null, null, true);
}

function sendBody(mv2) {
    if (!extractedOtp) tryCopyOtp(extractOtpFromAiBody(mv2));
    var body = sanitizeToolBodyForMarkdownV2(String(mv2));
    sendTg(header + body, 'MarkdownV2', function () {
        if (typeof exit !== 'undefined') exit();
    });
}

function fallbackBody(raw) {
    return escMv2(raw).replace(DIG_RE, function (m) {
        return '`' + escMv2Code(m) + '`';
    });
}

/** 從簡訊原文擷取 OTP／驗證碼（4～8 位數字） */
function extractOtpFromSms(raw) {
    if (!raw || raw === CFG.text_no_sms) return null;
    var s = String(raw);
    var patterns = [
        /驗證碼[為是：:為\s]*(\d{4,8})\b/i,
        /验证码[是为：:\s]*(\d{4,8})\b/i,
        /\bOTP[：:\s]*(\d{4,8})\b/i,
        /動態密碼[：:\s]*(\d{4,8})/i,
        /动态密码[：:\s]*(\d{4,8})/i,
        /(?:code|CODE)\s*[：:\s]+\s*(\d{4,8})\b/,
        /\[(\d{4,8})\]/,
        /\bPIN[碼码]?[：:\s]*(\d{4,8})\b/i,
        /授權碼[：:\s]*(\d{4,8})/i,
        /授权码[：:\s]*(\d{4,8})/i
    ];
    var i, m;
    for (i = 0; i < patterns.length; i++) {
        m = s.match(patterns[i]);
        if (m && m[1]) return m[1];
    }
    if (/驗證|验证|OTP|otp|校驗|校验|動態密|动态密|授權碼|授权码/i.test(s)) {
        m = s.match(/(?:^|[^\d])(\d{4,8})(?:[^\d]|$)/);
        if (m) return m[1];
    }
    return null;
}

/** AI 輸出含「OTP／驗證碼」且行內 code 時，擷取反引號內數字 */
function extractOtpFromAiBody(t) {
    if (!t || !CFG.copy_otp) return null;
    var s = String(t);
    if (!/OTP|驗證碼|验证码|動態|动态|授權碼|授权码/i.test(s)) return null;
    var m = s.match(/`(\d{4,8})`/);
    return m ? m[1] : null;
}

function tryCopyOtp(code) {
    if (!CFG.copy_otp || code == null || code === '') return;
    try {
        if (typeof setClip === 'function') {
            var ok = setClip(String(code), false);
            if (CFG.copy_otp_flash && ok) flash('📋 已複製驗證碼');
        }
    } catch (e) { /* Tasker 非 JS 環境或權限不足時略過 */ }
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

var extractedOtp = (resolved !== CFG.text_no_sms) ? extractOtpFromSms(resolved) : null;
if (extractedOtp) tryCopyOtp(extractedOtp);

var header =
    '*' + escMv2('✉ ' + global('SMSRF').replace(CFG.phone_strip_prefix, '') + nameSuffix) + '*\n' +
    escMv2(toEmoji(global('SMSRT')) + ' ' + global('SMSRD') + ' ' +
        global('SMSRT').replace('.', ':') + ' ' + silent) + '\n\n';

if (resolved === CFG.text_no_sms) {
    sendBody(fallbackBody(resolved));
} else {
    callAi(resolved).then(sendBody).catch(function (err) {
        var m = err && err.message ? err.message : String(err);
        var brief = m.length > 180 ? m.slice(0, 180) + '…' : m;
        flash('AI 處理失敗（已改用後備格式）：' + brief);
        sendAiErrorToTg(brief);
        sendBody(fallbackBody(resolved));
    });
}
