# DSH Discord 帳號助理與 MCP 插件 (`@luoyi-dsh/discord-plugin`)

<div align="center">

![DSH Discord Plugin Banner](banner.png)

**[English](../README.md) | [繁體中文](zh-Hant.md)**

</div>

> 專為 **Discord 使用者個人帳號（User Account / Selfbot）** 量身打造的智慧助理與 Model Context Protocol (MCP) 服務外掛。  
> 支援 DeepSeek Harness (DSH) 系統生態，具備「**被提及/引用/私訊智慧代回**」與「**群組即時穿插搭話**」雙大主動運作引擎，並提供文字訊息、圖片、文件檔案、貼圖與表情反應等全功能 13 項 MCP 操作工具集。  
> 支援 **DSH 平台訂閱額度 (Subscriptions)** 免自備 API Key 運作，並具備自訂 API 餘額不足自動無縫容錯降級機制。

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
   - 保持真人帳號身分在線（支援在線 `online`、閒置 `idle`、請勿打擾 `dnd`、隱身 `invisible`）。
   - 支援 HTTP / SOCKS5 代理伺服器連線。

2. **智慧代回引擎 (Mention, Quote & DM Assistant)**：
   - **被 @提及 或引用回覆**：主動收集近期上下文對話，推理後以帳號身分友善代回。
   - **私訊 (Direct Message) 雙向應答**：收到私訊時自動研判並回覆。
   - **Round Cap 防死循環上限**：限制單一對象連續回覆輪數，避免機器人間無窮遞迴。

3. **群組穿插搭話 (Autonomous Co-Chatting)**：
   - **即時 Gateway 監聽**：維護各頻道之滾動對話緩衝區 (Buffer)。
   - **智慧插嘴機制**：綜合關鍵字興趣、提問探測、隨機率與頻道獨立冷卻時間，自然融入話題。
   - **`[NO_REPLY]` 自覺放棄**：由模型自發判斷若對話過於嚴肅或私密則自動放棄插話。

4. **防封號安全機制 (Anti-Ban Protections)**：
   - **擬真人打字指示 (`sendTyping`)**：發送前模擬真人正在輸入中。
   - **隨機 Jitter 延遲**：模擬真人思考與打字所需之 2~5 秒隨機間隔。
   - **黑白名單與每日發言配額限制**：防止超量互動引發風控。

5. **DSH 平台訂閱與多元推理引擎 (LLM Engine)**：
   - 支援 DSH 宿主內建之平台訂閱額度（如 Antigravity、Codex、Grok 等），免填寫外部 API Key。
   - 支援外部自訂 API（相容 OpenAI / DeepSeek），並具備 **402 餘額不足自動無縫切換** 備援機制。

6. **DSH Web 瀏覽器端高質感設定介面 (`client.js`)**：
   - 遵循現代高質感設計規範，具備連線狀態卡片、Token 遮罩、即時測試發送器與今日互動統計。

---

## 📁 模組目錄架構

本外掛採用完全解耦的執行期動態初始化架構，不依賴任何隨套件分發的靜態資料檔：

```text
dsh-discord-plugin/
├── assets/
│   ├── banner.png                 # 專案橫幅圖示
│   └── zh-Hant.md                 # 本地化說明文件
├── client.js                      # DSH Web 前端面板 (連線、代回、穿插閒聊、即時測試)
├── cordis.patch.yml               # DSH bundle patch 外掛宣告
├── package.json                   # 模組定義 (discord.js-selfbot-v13, @modelcontextprotocol/sdk)
├── tsconfig.json                  # TypeScript ES2022 / NodeNext 編譯設定
├── CHANGELOG.md                   # 版本更新紀錄
├── README.md                      # 英文說明文件
├── README.zh-Hant.md              # 繁體中文說明文件
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
    │   ├── llm.ts                 # 統一 LLM 調用 (DSH Subscriptions 優先 + 外部 API 備援)
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
| **`discord_send_image`** | 發送圖片 | **傳圖片**：發送圖片（支援本機檔案路徑或網路圖片 URL，支援圖說）。 | `channel_id`, `image_path_or_url`, `caption` |
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

### 方式一：在 DSH / AI 對話中自然語言調用（最常用）

只要在 DSH 提示詞中以自然語言發出指令，主模型便會自動比對並調用對應的 MCP 工具：

```text
💬 範例 1：發送文字訊息 / 簡訊
「請幫我傳送一則 Discord 訊息到頻道 123456789012345678，內容是：『大家好，我已經上線了！』」
-> AI 將自動調用：discord_send_message(channel_id="123456789012345678", content="大家好，我已經上線了！")

💬 範例 2：傳送本機或網路圖片
「請幫我把圖片 C:/photos/banner.png 傳到 Discord 頻道 123456789012345678，附帶圖說：『新架構圖』」
-> AI 將自動調用：discord_send_image(channel_id="123456789012345678", image_path_or_url="C:/photos/banner.png", caption="新架構圖")
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

### 方式三：透過 HTTP REST API 調用 (DSH Web 路由)

```bash
curl -X POST http://127.0.0.1:3080/api/discord/send \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "123456789012345678",
    "type": "text",
    "content": "透過 REST API 發送的訊息"
  }'
```

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

### 3. 群組穿插搭話 (Autonomous Co-Chatting)
- **`coChatEnabled`**：是否啟用群組主動穿插閒聊（預設 `true`）。
- **`coChatProbability`**：搭話觸發基礎機率（`0~100%`，預設 `25%`）。
- **`coChatCooldownSeconds`**：同頻道連續搭話冷卻時間（秒，預設 `60` 秒）。
- **`coChatMinHistoryMessages`**：發言前最少累積之歷史訊息數（預設 `3` 則）。
- **`interestKeywords`**：興趣關鍵字清單（命中時提高搭話率 +35%）。
- **`maxDailyCoChats`**：每日主動穿插聊天上限（預設 `80` 則）。

### 4. 模型與推理解析配置 (LLM Configuration)
- **`llmMode`**：推理模型模式（`auto` 自動判斷、`subscriptions` 優先使用 DSH 平台訂閱額度、`custom` 僅使用自訂 API）。
- **`subscriptionProvider`**：DSH 平台訂閱提供商（如 `antigravity`、`codex`、`grok` 等）。
- **`subscriptionModel`**：DSH 平台訂閱指定模型名。
- **`customLlmApiKey`**：自訂 API Key（支援 OpenAI / DeepSeek 相容端點）。
- **`customLlmApiBase`**：自訂 API Base URL（例如 `https://api.deepseek.com`）。
- **`customLlmModel`**：自訂模型名稱（例如 `deepseek-chat`）。

### 5. 防封號與擬真輸入安全
- **`simulateTyping`**：發送前是否模擬真人正在輸入中 (`sendTyping`)（預設 `true`）。
- **`jitterMinSeconds`** / **`jitterMaxSeconds`**：擬真輸入隨機延遲下限/上限（預設 `2~5` 秒）。
- **`blacklistUserIds`**：黑名單用戶 ID 清單。
- **`whitelistUserIds`**：白名單用戶 ID 清單。
- **`blacklistChannelIds`**：黑名單頻道 ID 清單。

---

## 📜 版本發布紀錄 (Releases)

詳細版本演進與更新紀錄，請參閱 [CHANGELOG.md](../CHANGELOG.md)。

---

## 📄 授權條款

本專案採用 [MIT License](../LICENSE) 授權發布。
