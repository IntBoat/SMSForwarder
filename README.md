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

### 通用版

`WithCode.part.js` 是通用版，功能與進階版相同，處理後的信息內容會保存在 `%Message`，需要同時使用 `TelegramAPI.js`。
可用於發送任何信息到 Telegram，使用 Perform Task Action 來呼叫，`%par1` 為內容，`%par2` 為收件者 Chat ID。

#### 設定 Tasker

1. 新增一個執行 `TelegramAPI.js` 的 Task，名稱隨意，例如 `TelegramAPI`
2. 新增 Variable Set Action
   - Name: `%apiKey`
   - To: `設定為 Telegram Bot 的 API Key`
3. 新增 Variable Set Action，用於設定發送的信息內容
   - Name: `%Message`
   - To: `%par1`
4. 新增 Variable Set Action，用於設定預設的接收者 Chat ID
   - Name: `%chatID`
   - To: `%par2`
   - If: `%par2` 不等於空白
5. 新增 Variable Set Action，用於設定自訂接收者的 Chat ID，只有在 `%par2` 不為空白時才會使用
   - Name: `%chatID`
   - To: `%par2`
   - If: `%par2` 不等於空白
6. 新增 Action > Javascript-let
7. 複製 `TelegramAPI.js` 的內容到 Script 欄位
   - Auto Exit: `不要勾選`
8. 新增另一個 Task
9. 新增 Action > Javascript-let
10. 複製 `WithCode.part.js` 的內容到 Script 欄位
11. 新增 Perform Task Action
12. Name: `設定為剛剛新增的 Task 名稱（例如：TelegramAPI）`
    - Parameter 1: `%Message`
    - Parameter 2: `設定接收者的 Chat ID` 如果不設定，則會使用上面設定的 `%chatID` 值。