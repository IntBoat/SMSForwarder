# SMSForwarder

使用 Tasker 轉發 SMS 到 Telegram，並且自動複製驗證碼。

## 安裝

1. 安裝 Tasker
2. 在 Profile 中新增 Event > Phone > Received Text
3. 在 Task 中新增 Action > Variables > Variable Set (_**如果使用編譯版本可以略過**_)
    - Name: `%chat_id`
    - To: `設定為 Telegram Bot 的 Chat ID`
4. 在 Task 中新增 Action > Variables > Variable Set (_**如果使用編譯版本可以略過**_)
    - Name: `%api_key`
    - To: `設定為 Telegram Bot 的 API Key`
5. 在 Task 中新增 Action > Javascript-let
6. 複製 `XMLHttpRequest.standalone.js` 或 `WithCode.standalone.js` 的內容到 Script 欄位
    - `dist/` 中的檔案是經過壓縮的，需更改 `_CHAT_ID_` 及 `_BOT_API_KEY_`，留意 `_BOT_API_KEY_` 前面要保留 `bot` 字串。
7. 留意 `Auto Exit` 不要點選，否則有可能出現簡訊轉發尚未轉發，程式就已經被終止的問題。

### 簡單版

`XMLHttpRequest.standalone.js` 是簡易版，功能只有直接轉送 SMS 到 Telegram。

### 進階版

`WithCode.js` 是進階版，功能有：

- 顯示發件人的來源號碼或電話簿中名稱
- 轉發 SMS 到 Telegram
- 轉發 MMS 到 Telegram
- 自動複製驗證碼
- 時間會以 Emoji 方式顯示

Ref: [Paxxs's SMS_Forward_Tasker.js](https://gist.github.com/Paxxs/3bd1a694d8101054b6e04389d694c5e4)

### 編譯 `WithCode.js`
1. 在根目錄執行 `yarn install` 及 `yarn build`
2. 在 `dist/` 中找到 `WithCode.bundle.js`，複製內容到 Tasker 中的 Javascript-let 中的 Script 欄位