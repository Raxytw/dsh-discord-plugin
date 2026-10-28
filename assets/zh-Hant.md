# DSH Discord 帳號助理與 MCP 插件 (`@luoyi-dsh/discord-plugin`)

<div align="center">

![DSH Discord Plugin Banner](banner.png)

**[English](../README.md) | [繁體中文](zh-Hant.md) | [操作方法與 Agent 指南](../AGENTS.md)**

</div>

> 專為 **Discord 使用者個人帳號（User Account / Selfbot）** 量身打造的智慧助理與 Model Context Protocol (MCP) 服務外掛。  
> 支援 DeepSeek Harness (DSH) 系統生態，具備「**被提及/引用/私訊智慧代回**」與「**群組即時穿插搭話**」雙大主動運作引擎，並提供文字訊息、圖片、文件檔案、貼圖與表情反應等全功能 13 項 MCP 操作工具集。  
> 支援 **DSH 平台訂閱額度 (Subscriptions)** 免自備 API Key 運作，並具備自訂 API 餘額不足自動無縫容錯降級機制。

---

## 🌟 核心特色

1. **使用者個人帳號驅動 (User Account / Selfbot)**：
   - 使用使用者授權 Token (Authorization Token)，保持真人帳號身分在線（支援 `online`、`idle`、`dnd`、`invisible`），並支援 HTTP / SOCKS5 代理伺服器連線。
2. **智慧代回引擎 (Mention, Quote & DM Assistant)**：
   - **被 @提及 或引用回覆**：主動收集近期上下文對話，推理後以帳號身分友善代回。
   - **私訊 (Direct Message) 雙向應答**：收到私訊時自動研判並回覆，內建 Round Cap 防死循環上限。
3. **群組穿插搭話 (Autonomous Co-Chatting)**：
   - 即時監聽頻道訊息緩衝區，綜合關鍵字興趣、提問探測、隨機率與頻道獨立冷卻時間自然融入話題，並支援 `[NO_REPLY]` 自覺放棄。
4. **防封號安全機制 (Anti-Ban Protections)**：
   - 發送前模擬真人正在輸入中 (`sendTyping`)、2~5 秒隨機 Jitter 延遲，以及黑白名單與每日配額限制。
5. **DSH 平台訂閱與多元推理引擎 (LLM Engine)**：
   - 支援讀取外部訂閱外掛 (`dsh-plugin-subscriptions`) 授權之平台訂閱額度（Antigravity、Codex、Grok、Copilot），並具備自訂 API **402 餘額不足自動無縫切換** 備援機制。
6. **DSH Web 瀏覽器端高質感設定介面 (`client.js`)**：
   - 提供連線狀態卡片、Token 遮罩、即時測試發送器與今日互動統計面板。

---

## 🚀 安裝方式

```bash
# 透過 DSH 插件指令安裝（推薦）
dsh plugin --profile web add @luoyi-dsh/discord-plugin

# 或透過 NPM 安裝
npm install @luoyi-dsh/discord-plugin
```

---

## 📖 插件操作方法與工具調用說明

完整的 MCP 工具參數表、自然語言調用範例、HTTP REST API 端點、Node.js 跨插件調用方式與設定參數說明，請參閱 **[AGENTS.md](../AGENTS.md)**。

---

## 📁 模組目錄架構

```text
dsh-discord-plugin/
├── assets/
│   └── banner.png                 # 專案橫幅圖示
├── client.js                      # DSH Web 前端面板
├── cordis.patch.yml               # DSH bundle patch 外掛宣告
├── package.json                   # 模組定義與依賴
├── tsconfig.json                  # TypeScript 編譯設定
├── AGENTS.md                      # 插件操作方法與 Agent 調用指南
├── CHANGELOG.md                   # 版本更新紀錄
├── README.md                      # 英文介紹文件
├── README.zh-Hant.md              # 繁體中文介紹文件 (本檔案)
└── src/                           # 核心源代碼 (Selfbot 控制器、LLM 調度、代回與搭話任務、13 項工具)
```

---

## 📜 版本紀錄與授權條款

- 詳細版本更新請參閱 [CHANGELOG.md](../CHANGELOG.md)。
- 本專案採用 [MIT License](../LICENSE) 開源授權。
