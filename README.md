# 使用 Tasker 轉發 SMS 到 Telegram

## 安裝

1. 安裝 Tasker
2. 在 Profile 中新增 Event > Phone > Received Text
3. 在 Task 中新增 Action > Javascript-let
4. 複製 `XMLHttpRequest.js` 或 `WithCode.js` 的內容到 Script 欄位
5. 留意 `Auto Exit` 不要點選，否則有可能出現短信轉發尚考轉發，程式就已經被終止的問題。

### 簡單版

`XMLHttpRequest.js` 是簡易版，功能只有直接轉送 SMS 到 Telegram。

### 進階版

`WithCode.js` 是進階版，功能有：

- 顯示發件人的來源號碼或電話簿中名稱
- 轉發 SMS 到 Telegram
- 轉發 MMS 到 Telegram
- 自動複製驗證碼
- 時間會以 Emoji 方式顯示