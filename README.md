# DSH Discord 帳號助理與 MCP 插件 (`@luoyi-dsh/discord-plugin`)

![DSH Discord Plugin Banner](assets/banner.png)

> 專為 **Discord 使用者個人帳號（User Account / Selfbot）** 量身打造的智慧助理與 Model Context Protocol (MCP) 服務外掛。  
> 支援 DeepSeek Harness (DSH) 系統生態，具備「**被提及/引用/私訊智慧代回**」與「**群組即時穿插搭話**」雙大主動運作引擎，並提供文字訊息、圖片、文件檔案、貼圖與表情反應等全功能 13 項 MCP 操作工具集。

---

## 🚀 安裝方式

支援以下兩種安裝方式，可依您的使用情境選擇：

### 方式 1：透過 DSH 插件指令安裝（推薦）

```bash
dsh plugin --profile web add @luoyi-dsh/discord-plugin
```

### 方式 2：透過 NPM 安裝

```bash
npm install @luoyi-dsh/discord-plugin
```

---

## 🌟 核心特色

1. **使用者個人帳號驅動 (User Account / Selfbot)**：
   - 使用使用者授權 Token (Authorization Token)，非官方機器人 Bot Token。
   - 保持真人帳號身分在線（支援在線、閒置、請勿打擾、隱身）。
   - 支援 HTTP / SOCKS5 代理伺服器連線。

2. **智慧代回引擎 (Mention, Quote & DM Assistant)**：
   - **被 @提及 或引用回覆**：主動收集近期上下文對話，推理後以帳號身分友善代回。
   - **私訊 (Direct Message) 雙向應答**：收到私訊時自動研判並回覆。
   - **Round Cap 防死循環上限**：限制單一對象連續回覆輪數，避免機器人間無窮遞迴。

3. **群組穿插搭話 (Autonomous Co-Chatting)**：
   - **即時 Gateway 監聽**：維護各頻道之滾動對話緩衝區 (Buffer)。
   - **智慧插嘴機制**：綜合關鍵字興趣、提問探測、隨機率與頻道獨立冷卻時間，自然融入大家的話題。
   - **`[NO_REPLY]` 自覺放棄**：由模型自發判斷若對話過於嚴肅或私密則自動放棄插話。

4. **防封號安全機制 (Anti-Ban Protections)**：
   - **擬真人打字指示 (`sendTyping`)**：發送前模擬真人正在輸入中。
   - **隨機 Jitter 延遲**：模擬真人思考與打字所需之 2~5 秒隨機間隔。
   - **黑白名單與每日發言配額限制**：防止超量互動引發風控。

5. **DSH Web 瀏覽器端高質感設定介面 (`client.js`)**：
   - 遵循 `.agents/skills/design-taste-frontend` 規範，具備連線狀態卡片、Token 編輯、即時測試發送器與今日互動統計。

---

## 📁 模組目錄架構

本外掛採用完全解耦的執行期動態初始化架構，不依賴任何隨套件分發的靜態資料檔：

```text
dsh-discord-plugin/
├── assets/
│   └── banner.png                 # 專案橫幅圖示
├── client.js                      # DSH Web 前端面板 (連線、代回、穿插閒聊、即時測試)
├── cordis.patch.yml               # DSH bundle patch 外掛宣告
├── package.json                   # 模組定義 (discord.js-selfbot-v13, @modelcontextprotocol/sdk)
├── tsconfig.json                  # TypeScript ES2022 / NodeNext 編譯設定
├── data/                          # 【執行期動態建立，不進 Git / NPM】
│   ├── config.json                # 本地設定檔 (初次啟動自動產生)
│   └── ledger.json                # 去重、Round Cap 輪數、每日統計帳本 (自動初始化)
└── src/
    ├── index.ts                   # Cordis 外掛入口、Gateway 監聽調度與 REST API
    ├── config.ts                  # Schemastery 設定模型與預設值過濾
    ├── types.ts                   # 型態宣告 (連線狀態、訊息緩衝、配置參數)
    ├── mcp-server.ts              # 獨立 MCP Stdio 伺服器入口
    ├── lib/
    │   ├── discordClient.ts       # Selfbot 核心控制器 (WebSocket 連線、發言、發圖、發貼圖)
    │   ├── ledger.ts              # 狀態帳本與冷卻時間管理器
    │   ├── llm.ts                 # 統一 LLM 調用 (DSH ctx.llm 優先 + 外部 API 備援)
    │   └── hostdeps.ts            # DSH 宿主相容層
    ├── duty/
    │   ├── mentionReply.ts        # 被 @ 提及、引用回覆與私訊智慧代回任務
    │   └── autoChat.ts            # 群組即時穿插搭話任務 (Co-Chatting)
    └── tools/
        └── discordTools.ts        # 13 項 Discord MCP 標準操作工具集
```

---

## 🛠️ 13 項 Discord MCP 標準操作工具清單

| 工具名稱 | 類型 | 說明 | 主要參數 |
| :--- | :--- | :--- | :--- |
| **`discord_check_status`** | 狀態查詢 | 檢查目前使用者帳號連線狀態、用戶資訊、Ping 延遲與今日互動統計。 | 無 |
| **`discord_login`** | 帳號認證 | 連線或切換使用者 Token (支援 Proxy)。 | `token` (必填), `proxy_url` (選填) |
| **`discord_send_message`** | 發送文字 | **傳文字/簡訊**：發送訊息至指定頻道 ID 或使用者 ID（發送私訊）。 | `channel_id`, `content`, `simulate_typing` |
| **`discord_reply_message`**| 指定回覆 | **引用回覆**：以 Discord 引用格式指定回覆特定訊息 ID。 | `channel_id`, `message_id`, `content`, `mention` |
| **`discord_send_image`** | 發送圖片 | **傳圖片**：發送圖片（支援本機檔案絕對/相對路徑或網路圖片 URL，支援圖說）。 | `channel_id`, `image_path_or_url`, `caption` |
| **`discord_send_file`** | 發送附件 | **傳文件**：發送 PDF、Word、程式碼檔案、ZIP 壓縮檔等文件附件。 | `channel_id`, `file_path`, `content` |
| **`discord_send_sticker`** | 發送貼圖 | **發貼圖**：在頻道中發送指定貼圖 (Sticker)。 | `channel_id`, `sticker_id` |
| **`discord_add_reaction`** | 表情反應 | 為指定訊息添加 Emoji 表情反應（👍、❤️、🔥 等）。 | `channel_id`, `message_id`, `emoji` |
| **`discord_get_messages`** | 訊息讀取 | **讀取聊天訊息**：獲取特定頻道或私訊對話之最新歷史紀錄。 | `channel_id`, `limit` (預設 15，最大 50) |
| **`discord_list_guilds`** | 伺服器查詢 | 列出此帳號已加入的所有伺服器清單。 | 無 |
| **`discord_list_channels`**| 頻道查詢 | 列出伺服器內所有可發言的文字頻道清單。 | `guild_id` (選填) |
| **`discord_list_dms`** | 私訊查詢 | 列出最近開啟之私訊對象清單。 | 無 |
| **`discord_search_stickers`**| 貼圖搜尋 | 搜尋此帳號加入之伺服器內可用的貼圖清單。 | `query` (選填關鍵字) |

---

## 💻 工具調用方式 (How to Call Tools)

本插件提供 **4 種靈活的調用方式**：

### 方式一：在 DSH / AI 對話中自然語言調用（最常用）

只要在 DSH 提示詞中以自然語言發出指令，主模型便會自動比對並調用對應的 MCP 工具：

```text
💬 範例 1：發送文字訊息 / 簡訊
「請幫我傳送一則 Discord 訊息到頻道 123456789012345678，內容是：『大家好，我已經上線了！』」
-> AI 將自動調用：discord_send_message(channel_id="123456789012345678", content="大家好，我已經上線了！")

💬 範例 2：傳送本機或網路圖片
「請幫我把圖片 C:/photos/banner.png 傳到 Discord 頻道 123456789012345678，附帶圖說：『新版本架構圖』」
-> AI 將自動調用：discord_send_image(channel_id="123456789012345678", image_path_or_url="C:/photos/banner.png", caption="新版本架構圖")

💬 範例 3：傳送文件 / PDF 檔案
「請將 C:/documents/report.pdf 文件傳送給 Discord 頻道 123456789012345678」
-> AI 將自動調用：discord_send_file(channel_id="123456789012345678", file_path="C:/documents/report.pdf", content="今日測試報告")

💬 範例 4：讀取頻道歷史訊息並總結
「請幫我查看 Discord 頻道 123456789012345678 最近 15 則訊息，並告訴我大家剛才在討論什麼？」
-> AI 將自動調用：discord_get_messages(channel_id="123456789012345678", limit=15) -> 閱讀後向您總結討論重點

💬 範例 5：指定回覆與貼圖表情
「請回覆訊息 998877665544332211 說：『收到！馬上處理』，順便在該訊息按個 👍」
-> AI 將自動調用：
   1. discord_reply_message(channel_id="...", message_id="998877665544332211", content="收到！馬上處理")
   2. discord_add_reaction(channel_id="...", message_id="998877665544332211", emoji="👍")
```

---

### 方式二：標準 MCP 協議 (JSON-RPC) 調用

若在 Claude Desktop、Cursor、Gemini 或以程式透過 Stdio 連線時，發送標準的 `tools/call` JSON 請求：

#### 1. 發送文字訊息 (`discord_send_message`)
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

#### 2. 發送圖片 (`discord_send_image`)
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "discord_send_image",
    "arguments": {
      "channel_id": "123456789012345678",
      "image_path_or_url": "C:/images/screenshot.png",
      "caption": "截圖說明"
    }
  }
}
```

#### 3. 發送文件/附件 (`discord_send_file`)
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "discord_send_file",
    "arguments": {
      "channel_id": "123456789012345678",
      "file_path": "C:/data/export.zip",
      "content": "導出的資料壓縮包"
    }
  }
}
```

#### 4. 發送貼圖 (`discord_send_sticker`)
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "discord_send_sticker",
    "arguments": {
      "channel_id": "123456789012345678",
      "sticker_id": "749054660769218631"
    }
  }
}
```

#### 5. 讀取聊天紀錄 (`discord_get_messages`)
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "discord_get_messages",
    "arguments": {
      "channel_id": "123456789012345678",
      "limit": 10
    }
  }
}
```

---

### 方式三：透過 HTTP REST API 調用 (DSH Web 路由)

> 💡 **提示**：DSH Web 預設埠為 **3080**。若啟動時帶了 `--port` 參數，請改用實際埠號。

#### 1. 發送文字 / 圖片 / 文件 / 貼圖 (`POST /api/discord/send`)

- **發送文字**：
  ```bash
  curl -X POST http://127.0.0.1:3080/api/discord/send \
    -H "Content-Type: application/json" \
    -d '{
      "channelId": "123456789012345678",
      "type": "text",
      "content": "透過 REST API 發送的訊息"
    }'
  ```

- **發送圖片**：
  ```bash
  curl -X POST http://127.0.0.1:3080/api/discord/send \
    -H "Content-Type: application/json" \
    -d '{
      "channelId": "123456789012345678",
      "type": "image",
      "imagePath": "C:/images/test.png",
      "content": "附帶圖片說明"
    }'
  ```

- **發送貼圖**：
  ```bash
  curl -X POST http://127.0.0.1:3080/api/discord/send \
    -H "Content-Type: application/json" \
    -d '{
      "channelId": "123456789012345678",
      "type": "sticker",
      "stickerId": "749054660769218631"
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

---

### 方式四：在 TypeScript / Node.js 程式碼中調用

在其他 DSH 外掛或自訂模組中，直接引入單例客戶端執行操作：

```typescript
import { getSharedDiscordClient } from '@luoyi-dsh/discord-plugin'

const client = getSharedDiscordClient()
if (client && client.isReady) {
  // 1. 發送訊息
  await client.sendMessage('123456789012345678', 'Hello World!')

  // 2. 發送圖片
  await client.sendImage('123456789012345678', 'C:/pic.png', '看這張圖')

  // 3. 讀取最近歷史訊息
  const history = await client.getMessages('123456789012345678', 10)
  console.log('歷史訊息:', history.messages)
}
```

---

## 🔌 獨立 MCP 伺服器 (Stdio) 配置

本外掛支援作為獨立 MCP Stdio 服務運行，可直接配置於 Claude Desktop、Cursor、Gemini 或 Antigravity 中：

在 `claude_desktop_config.json` 中配置：

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

## 🎨 DSH Web 設置面板 (`client.js`)

本插件提供符合 `.agents/skills/design-taste-frontend` 規範的 DSH 瀏覽器端設定面板：
- **極致防風控與隱私保護**：Token 遮罩切換、發言模擬打字開關、隨機 Jitter 延遲設定。
- **高資訊密度與精緻排版**：1px 邊框、全語意狀態膠囊（在線 Emerald / 警告 Amber / 離線 Rose）。
- **即時連線狀態與 KPI 指標**：Avatar 頭像、即時在線狀態點、今日提及代回 / 群聊穿插 / 私訊代回統計進度條。
- **即時控制台**：在介面中直接選取伺服器與頻道，立即發送文字、圖片、文件與貼圖。

### 如何開啟設定面板
啟動 DSH Web（`dsh web`，預設網址 `http://127.0.0.1:3080`）後，可透過以下入口進入：
1. **左側一級導航**：點選設定側邊欄的 **「Discord」** 專屬面板。
2. **外掛程式管理**：進入「外掛程式 (Plugins)」卡片列表，點擊 **「Discord 帳號助理」**。
3. **頂部頁籤**：於外掛程式設定頁頂部切換至 **「Discord」** 頁籤。

---

## ⚙️ 詳細設定參數說明 (Settings)

可於 DSH Web 設定面板或 `data/config.json` 中配置：

### 1. 帳號與連線
- **`userToken`**：Discord 使用者授權 Token（非機器人 Token）。
- **`proxyUrl`**：代理伺服器 URL（例如 `http://127.0.0.1:7890`，選填）。
- **`status`**：在線狀態（`online` 在線、`idle` 閒置、`dnd` 請勿打擾、`invisible` 隱身）。
- **`autoStart`**：DSH 啟動時是否自動連線（預設 `true`）。

### 2. 提及與私訊代回 (Mention & DM Assistant)
- **`mentionReplyEnabled`**：是否自動回覆被 @ 提及或引用回覆（預設 `true`）。
- **`dmReplyEnabled`**：是否自動代回私訊 (DM)（預設 `true`）。
- **`replyQuote`**：回覆時是否保留 Discord 引用格式（預設 `true`）。
- **`roundCapPerUser`**：單一對象連續回覆輪數上限（預設 `5` 輪，徹底防死循環）。
- **`maxDailyMentionReplies`**：每日被提及回覆上限（預設 `60` 則）。
- **`maxDailyDmReplies`**：每日私訊代回上限（預設 `60` 則）。
- **`mentionPersonaPrompt`**：提及回覆時的人設 Prompt。
- **`dmPersonaPrompt`**：私訊代回時的人設 Prompt。

### 3. 群組穿插搭話 (Autonomous Co-Chatting)
- **`coChatEnabled`**：是否啟用群組主動穿插閒聊（預設 `true`）。
- **`coChatProbability`**：搭話觸發基礎機率（`0~100%`，預設 `25%`）。
- **`coChatCooldownSeconds`**：同頻道連續搭話冷卻時間（秒，預設 `60` 秒）。
- **`coChatMinHistoryMessages`**：發言前最少累積之歷史訊息數（預設 `3` 則）。
- **`interestKeywords`**：興趣關鍵字清單（命中時提高搭話率 +35%，預設 `["ai", "遊戲", "code", "bug", "吃什麼", "伺服器"]`）。
- **`maxDailyCoChats`**：每日主動穿插聊天上限（預設 `80` 則）。
- **`coChatPersonaPrompt`**：群聊搭話風格 Prompt（支援 `[NO_REPLY]` 判定）。
- **`monitoredChannelIds`**：指定監聽頻道 ID 清單（留空代表監聽有權限的所有文字頻道）。

### 4. 防封號與擬真輸入安全
- **`simulateTyping`**：發送前是否模擬真人正在輸入中 (`sendTyping`)（預設 `true`）。
- **`jitterMinSeconds`** / **`jitterMaxSeconds`**：擬真輸入隨機延遲下限/上限（預設 `2~5` 秒）。
- **`blacklistUserIds`**：黑名單用戶 ID 清單。
- **`whitelistUserIds`**：白名單用戶 ID 清單（非空時僅回覆名單內成員）。
- **`blacklistChannelIds`**：黑名單頻道 ID 清單。

---

## 🔑 如何獲取 Discord 使用者 Token

1. 使用電腦瀏覽器（如 Chrome / Edge）登入 [Discord 網頁版](https://discord.com/app)。
2. 按鍵盤 `F12` 或右鍵點選「檢查」開啟**開發者工具**，切換到 **Network (網路)** 標籤頁。
3. 在任意伺服器發送一則訊息或點擊左側頻道清單。
4. 在 Network 請求列表中點選任意 Discord API 請求（例如 `messages` 或 `typing`）。
5. 查看 **Headers (標頭)** -> **Request Headers**，找到 **`authorization`** 欄位。
6. 複製該欄位完整字串（請妥善保管，勿外洩給他人）。

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 授權發布。
