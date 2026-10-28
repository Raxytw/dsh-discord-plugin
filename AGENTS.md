# AGENTS.md — `@luoyi-dsh/discord-plugin` 操作指南與工具調用規範

本文件為 AI Agent、DeepSeek Harness (DSH) 主模型與開發者提供 `@luoyi-dsh/discord-plugin` 的完整插件操作方法、MCP 工具清單、REST API 路由、跨插件 SDK 調用與配置參數說明。

---

## 🛠️ 1. 提供的 13 項 Discord MCP 標準操作工具

| 工具名稱 | 類型 | 說明 | 主要參數 |
| :--- | :--- | :--- | :--- |
| **`discord_check_status`** | 狀態查詢 | 檢查目前使用者帳號連線狀態、用戶資訊、Ping 延遲與今日互動統計。 | 無 |
| **`discord_login`** | 帳號認證 | 連線或切換使用者 Token (支援 Proxy)。 | `token` (必填), `proxy_url` (選填) |
| **`discord_send_message`** | 發送文字 | 發送訊息至指定頻道 ID 或使用者 ID（發送私訊）。 | `channel_id`, `content`, `simulate_typing` |
| **`discord_reply_message`**| 指定回覆 | 以 Discord 引用格式指定回覆特定訊息 ID。 | `channel_id`, `message_id`, `content`, `mention` |
| **`discord_send_image`** | 發送圖片 | 發送圖片（支援本機檔案路徑或網路圖片 URL，支援圖說）。 | `channel_id`, `image_path_or_url`, `caption` |
| **`discord_send_file`** | 發送附件 | 發送 PDF、Word、程式碼檔案、ZIP 壓縮檔等文件附件。 | `channel_id`, `file_path`, `content` |
| **`discord_send_sticker`** | 發送貼圖 | 在頻道中發送指定貼圖 (Sticker)。 | `channel_id`, `sticker_id` |
| **`discord_add_reaction`** | 表情反應 | 為指定訊息添加 Emoji 表情反應（👍、❤️、🔥 等）。 | `channel_id`, `message_id`, `emoji` |
| **`discord_get_messages`** | 訊息讀取 | 獲取特定頻道或私訊對話之最新歷史紀錄。 | `channel_id`, `limit` (預設 15，最大 50) |
| **`discord_list_guilds`** | 伺服器查詢 | 列出此帳號已加入的所有伺服器清單。 | 無 |
| **`discord_list_channels`**| 頻道查詢 | 列出伺服器內所有可發言的文字頻道清單。 | `guild_id` (選填) |
| **`discord_list_dms`** | 私訊查詢 | 列出最近開啟之私訊對象清單。 | 無 |
| **`discord_search_stickers`**| 貼圖搜尋 | 搜尋此帳號加入之伺服器內可用的貼圖清單。 | `query` (選填關鍵字) |

---

## 💻 2. 工具調用方式 (How to Call Tools)

### 方式一：DSH / AI 對話中自然語言調用

```text
💬 範例 1：發送文字訊息 / 簡訊
「請幫我傳送一則 Discord 訊息到頻道 123456789012345678，內容是：『大家好，我已經上線了！』」
-> 調用：discord_send_message(channel_id="123456789012345678", content="大家好，我已經上線了！")

💬 範例 2：傳送本機或網路圖片
「請幫我把圖片 C:/photos/banner.png 傳到 Discord 頻道 123456789012345678，附帶圖說：『新架構圖』」
-> 調用：discord_send_image(channel_id="123456789012345678", image_path_or_url="C:/photos/banner.png", caption="新架構圖")

💬 範例 3：傳送文件 / PDF 檔案
「請將 C:/documents/report.pdf 文件傳送給 Discord 頻道 123456789012345678」
-> 調用：discord_send_file(channel_id="123456789012345678", file_path="C:/documents/report.pdf", content="今日測試報告")

💬 範例 4：讀取頻道歷史訊息並總結
「請幫我查看 Discord 頻道 123456789012345678 最近 15 則訊息，並告訴我大家剛才在討論什麼？」
-> 調用：discord_get_messages(channel_id="123456789012345678", limit=15)

💬 範例 5：指定回覆與貼圖表情
「請回覆訊息 998877665544332211 說：『收到！馬上處理』，順便在該訊息按個 👍」
-> 調用：
   1. discord_reply_message(channel_id="...", message_id="998877665544332211", content="收到！馬上處理")
   2. discord_add_reaction(channel_id="...", message_id="998877665544332211", emoji="👍")
```

### 方式二：標準 MCP 協議 (JSON-RPC) 調用

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "discord_send_message",
    "arguments": {
      "channel_id": "123456789012345678",
      "content": "哈囉！這是一則來自 MCP 的自動化發言。",
      "simulate_typing": true
    }
  }
}
```

### 方式三：透過 HTTP REST API 調用 (DSH Web 路由，預設埠 3080)

#### 1. 發送文字 / 圖片 / 文件 / 貼圖 (`POST /api/discord/send`)
```bash
curl -X POST http://127.0.0.1:3080/api/discord/send \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "123456789012345678",
    "type": "text",
    "content": "透過 REST API 發送的訊息"
  }'
```

#### 2. 獲取特定頻道訊息歷史 (`GET /api/discord/messages`)
```bash
curl "http://127.0.0.1:3080/api/discord/messages?channelId=123456789012345678&limit=15"
```

#### 3. 獲取當前連線狀態與今日發言統計 (`GET /api/discord/status`)
```bash
curl http://127.0.0.1:3080/api/discord/status
```

#### 4. 讀取與儲存插件設定 (`GET / POST /api/discord/config`)
```bash
curl http://127.0.0.1:3080/api/discord/config
```

### 方式四：在 TypeScript / Node.js 程式碼中調用

```typescript
import { getSharedDiscordClient } from '@luoyi-dsh/discord-plugin'

const client = getSharedDiscordClient()
if (client && client.isReady) {
  await client.sendMessage('123456789012345678', 'Hello World!')
  const history = await client.getMessages('123456789012345678', 10)
  console.log('歷史訊息:', history.messages)
}
```

---

## 🔌 3. 獨立 MCP 伺服器 (Stdio) 配置

```json
{
  "mcpServers": {
    "discord": {
      "command": "npx",
      "args": ["-y", "@luoyi-dsh/discord-plugin"],
      "env": {
        "DISCORD_USER_TOKEN": "您的_DISCORD_USER_TOKEN"
      }
    }
  }
}
```

---

## ⚙️ 4. 設定參數說明 (`data/config.json`)

- **帳號與連線**：`userToken`、`proxyUrl`、`status` (`online` | `idle` | `dnd` | `invisible`)、`autoStart`
- **提及與私訊代回**：`mentionReplyEnabled`、`dmReplyEnabled`、`replyQuote`、`roundCapPerUser`、`maxDailyMentionReplies`、`maxDailyDmReplies`、`mentionPersonaPrompt`、`dmPersonaPrompt`
- **群組穿插搭話**：`coChatEnabled`、`coChatProbability`、`coChatCooldownSeconds`、`coChatMinHistoryMessages`、`interestKeywords`、`maxDailyCoChats`、`coChatPersonaPrompt`、`monitoredChannelIds`
- **LLM 推理與外部訂閱額度**：`llmMode` (`auto` | `subscriptions` | `custom`)、`subscriptionProvider` (`antigravity` | `codex` | `grok` | `copilot`)、`subscriptionModel`、`customLlmApiKey`、`customLlmApiBase`、`customLlmModel`
- **防封號保護**：`simulateTyping`、`jitterMinSeconds`、`jitterMaxSeconds`、`blacklistUserIds`、`whitelistUserIds`、`blacklistChannelIds`
