export default class TelegramAPI {
    apiKey: string;
    chatID: string;
    apiURL: string;
    isNightTime: boolean;

    constructor(apiKey: string, chatID: string, apiURL: string) {
        this.apiKey = apiKey;
        this.chatID = chatID;
        this.apiURL = apiURL;

        if (!this.chatID) {
            flash('請設定 chatID。');
            return;
        }
        if (!this.apiKey) {
            flash('請設定 apiKey。');
            return;
        }

        const now = new Date();
        const hour = now.getHours();
        this.isNightTime = hour >= 22 || hour < 7;
    }

    sendMessage(message: {
        text: string;
        parse_mode?: string;
        resultHandler?: (result: any) => void;
        errorHandler?: (error: any) => void;
        exitHandler?: () => void;
        [key: string]: any;
    }) {
        if (!message.text) {
            flash('不能發送空白訊息。');
            return;
        }
        if (message.text.length > 4096) {
            flash('訊息超過 4096 字元。');
            return;
        }
        const defaultBody = {
            chat_id: this.chatID,
            text: message.text,
            parse_mode: message.parse_mode || 'HTML',
            disable_notification: this.isNightTime
        };
        const mergedBody = {
            ...defaultBody,
            ...message
        };
        const formBody: Record<string, string> = {};
        Object.keys(mergedBody).forEach((key) => {
            const value = mergedBody[key];
            if (typeof value === 'function' || value == null) return;
            formBody[key] = String(value);
        });
        const requestOptions = {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/x-www-form-urlencoded'
            }),
            body: new URLSearchParams(formBody),
            redirect: 'follow' as RequestRedirect
        };

        fetch(`https://${this.apiURL}/bot${this.apiKey}/sendMessage`, requestOptions)
            .then(response => response.json())
            .then(message.resultHandler || ((result) => {
                if (result.ok) {
                    flash('📩 信息已發送。');
                    return;
                }
                flash('📩 信息發送異常：' + result.description);
            }))
            .catch(message.errorHandler || ((error) => flash(`📩 信息發送異常：${error}`)))
            .then(message.exitHandler || (() => {
                if (typeof exit !== 'undefined') exit();
            }));
    }
}