# DSH Discord User Assistant & MCP Plugin (`@luoyi-dsh/discord-plugin`)

<div align="center">

![DSH Discord Plugin Banner](assets/banner.png)

**[English](README.md) | [繁體中文](README.zh-Hant.md)**

</div>

> A specialized smart assistant and Model Context Protocol (MCP) plugin designed for **Discord User Accounts (Selfbot)**.  
> Fully integrated into the DeepSeek Harness (DSH) ecosystem, featuring two autonomous engines: **Mention, Quote & DM Assistant** and **Autonomous Co-Chatting**, alongside a complete suite of **13 MCP tools** covering text, images, files, stickers, and emoji reactions.  
> Features native support for **DSH Platform Subscriptions (Antigravity, Codex, Grok)** for zero-API-key operation, and automatic seamless fallback when external API quotas are exhausted (HTTP 402 Insufficient Balance).

---

## 🚀 Installation

Choose between the DSH CLI or standard NPM installation:

### Method 1: Via DSH Plugin CLI (Recommended)

```bash
dsh plugin --profile web add @luoyi-dsh/discord-plugin
```

### Method 2: Via NPM

```bash
npm install @luoyi-dsh/discord-plugin
```

---

## 🌟 Key Features

1. **User Account Driven (Selfbot Engine)**:
   - Uses user authorization tokens (not official bot tokens).
   - Simulates human online presence states (`online`, `idle`, `dnd`, `invisible`).
   - Supports HTTP and SOCKS5 outbound proxies.

2. **Smart Reply Engine (Mentions, Quotes & DMs)**:
   - **@Mentions & Quote Replies**: Automatically extracts recent channel conversation context and synthesizes reasoned responses under your identity.
   - **Direct Message (DM) Assistant**: Handles 1-on-1 private inquiries autonomously.
   - **Round Cap Protection**: Limits sequential conversational rounds per user to prevent infinite bot-to-bot loops.

3. **Autonomous Co-Chatting (Group Conversations)**:
   - **Real-time Gateway Monitoring**: Maintains sliding message buffers across active channels.
   - **Context-Aware Participation**: Weighs interest keywords, question detection, probability triggers, and channel-specific cooldowns to engage naturally in discussions.
   - **`[NO_REPLY]` Introspection**: LLM autonomously drops out if discussions are deemed sensitive, private, or inappropriate to interrupt.

4. **Anti-Ban Safety System**:
   - **Human Typing Indicators (`sendTyping`)**: Sends typing status prior to dispatching messages.
   - **Random Jitter Delay**: Emulates 2–5 seconds human cognitive and keystroke latency.
   - **Whitelists, Blacklists & Quota Limits**: Comprehensive rate-limiting controls to prevent spam flags.

5. **Multi-Tier LLM Reasoning Engine**:
   - Native integration with DSH Platform Subscriptions (e.g. Antigravity, Codex, Grok, Claude, Gemini) without requiring external API keys.
   - Compatible with custom OpenAI / DeepSeek API endpoints.
   - **Automatic 402 Failover**: Gracefully switches to DSH subscription quota if custom API credits are depleted.

6. **Premium Web Settings Dashboard (`client.js`)**:
   - Single-bundle browser UI featuring token masking, live connection tests, KPI progress gauges, and real-time message dispatchers.

---

## 📁 Directory Structure

```text
dsh-discord-plugin/
├── assets/
│   ├── banner.png                 # Promotional banner
│   └── zh-Hant.md                 # Localized documentation
├── client.js                      # DSH Web UI dashboard
├── cordis.patch.yml               # DSH bundle patch manifest
├── package.json                   # Package metadata and dependencies
├── tsconfig.json                  # TypeScript compiler settings
├── CHANGELOG.md                   # Version release notes
├── README.md                      # English documentation (This file)
├── README.zh-Hant.md              # Traditional Chinese documentation
├── data/                          # [Runtime generated, ignored in Git]
│   ├── config.json                # Local configuration
│   └── ledger.json                # Deduplication, round caps, and quota ledger
└── src/
    ├── index.ts                   # Cordis plugin entrypoint, Gateway dispatcher, and REST API
    ├── config.ts                  # Schemastery config schema
    ├── types.ts                   # TypeScript interfaces and types
    ├── mcp-server.ts              # Standalone MCP Stdio entrypoint
    ├── lib/
    │   ├── discordClient.ts       # Selfbot controller (WebSocket connection, messaging, media)
    │   ├── ledger.ts              # State ledger and cooldown manager
    │   ├── llm.ts                 # Unified LLM caller (Subscriptions & custom failover)
    │   └── hostdeps.ts            # DSH runtime compatibility layer
    ├── duty/
    │   ├── mentionReply.ts        # Mention and DM assistant tasks
    │   └── autoChat.ts            # Autonomous group co-chatting duty
    └── tools/
        └── discordTools.ts        # 13 standard Discord MCP tools
```

---

## 🛠️ Available MCP Tools (13 Standard Tools)

| Tool Name | Type | Description | Key Parameters |
| :--- | :--- | :--- | :--- |
| **`discord_check_status`** | Status | Query current user account connection status, user profile, ping, and daily stats. | None |
| **`discord_login`** | Auth | Connect or switch user token with optional proxy configuration. | `token` (required), `proxy_url` |
| **`discord_send_message`** | Action | Send plain text message to a channel or user DM. | `channel_id`, `content`, `simulate_typing` |
| **`discord_reply_message`**| Action | Reply to a specific message using Discord quote syntax. | `channel_id`, `message_id`, `content`, `mention` |
| **`discord_send_image`** | Action | Upload an image file (local path or remote URL) with an optional caption. | `channel_id`, `image_path_or_url`, `caption` |
| **`discord_send_file`** | Action | Upload a document, PDF, code file, or ZIP archive. | `channel_id`, `file_path`, `content` |
| **`discord_send_sticker`** | Action | Send a Discord sticker in the specified channel. | `channel_id`, `sticker_id` |
| **`discord_add_reaction`** | Action | React to a specific message with an Emoji (👍, ❤️, 🔥, etc.). | `channel_id`, `message_id`, `emoji` |
| **`discord_get_messages`** | Query | Fetch recent chat history from a channel or DM. | `channel_id`, `limit` (default 15, max 50) |
| **`discord_list_guilds`** | Query | List all joined Discord servers (guilds). | None |
| **`discord_list_channels`**| Query | List all writable text channels in a specified server. | `guild_id` (optional) |
| **`discord_list_dms`** | Query | List all active direct message channels. | None |
| **`discord_search_stickers`**| Query | Search for available stickers across joined servers. | `query` (optional keyword) |

---

## 💻 How to Call Tools

### 1. Via Natural Language in DSH Chat (Most Common)

Ask the DSH host model directly in conversation:

```text
💬 Example 1: Sending a message
"Please send a message to Discord channel 123456789012345678: 'Hello everyone, I am back online!'"
-> AI calls: discord_send_message(channel_id="123456789012345678", content="Hello everyone, I am back online!")

💬 Example 2: Sending a local or web image
"Please upload C:/photos/banner.png to Discord channel 123456789012345678 with caption 'System Architecture'"
-> AI calls: discord_send_image(channel_id="123456789012345678", image_path_or_url="C:/photos/banner.png", caption="System Architecture")

💬 Example 3: Reading and summarizing history
"Summarize what happened in channel 123456789012345678 over the last 15 messages."
-> AI calls: discord_get_messages(channel_id="123456789012345678", limit=15) -> Synthesizes summary
```

---

### 2. Standard MCP Protocol (JSON-RPC)

When connected via Claude Desktop, Cursor, or Stdio:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "discord_send_message",
    "arguments": {
      "channel_id": "123456789012345678",
      "content": "Automated message from MCP.",
      "simulate_typing": true
    }
  }
}
```

---

### 3. Via HTTP REST API (DSH Web Routes)

> 💡 **Note**: Default DSH Web port is **3080**.

#### 1. Send Message / Media (`POST /api/discord/send`)
```bash
curl -X POST http://127.0.0.1:3080/api/discord/send \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "123456789012345678",
    "type": "text",
    "content": "Message dispatched via REST API"
  }'
```

#### 2. Get Channel History (`GET /api/discord/messages`)
```bash
curl "http://127.0.0.1:3080/api/discord/messages?channelId=123456789012345678&limit=15"
```

#### 3. Get Status & Activity Metrics (`GET /api/discord/status`)
```bash
curl http://127.0.0.1:3080/api/discord/status
```

---

### 4. Direct Invocation via TypeScript / Node.js

```typescript
import { getSharedDiscordClient } from '@luoyi-dsh/discord-plugin'

const client = getSharedDiscordClient()
if (client && client.isReady) {
  // 1. Send text message
  await client.sendMessage('123456789012345678', 'Hello World!')

  // 2. Fetch history
  const history = await client.getMessages('123456789012345678', 10)
  console.log('Messages:', history.messages)
}
```

---

## 🔌 Standalone MCP Server Configuration

To configure as a standalone MCP server for **Claude Desktop**, edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "npx",
      "args": ["-y", "@luoyi-dsh/discord-plugin"],
      "env": {
        "DISCORD_USER_TOKEN": "YOUR_DISCORD_USER_TOKEN"
      }
    }
  }
}
```

---

## ⚙️ Configuration Parameters (Settings)

Configure via the DSH Web UI or `data/config.json`:

### 1. Account & Connection
- **`userToken`**: Discord user account token (authorization token, not a bot token).
- **`proxyUrl`**: Outbound proxy URL (e.g. `http://127.0.0.1:7890`, optional).
- **`status`**: Presence state (`online`, `idle`, `dnd`, `invisible`).
- **`autoStart`**: Automatically connect on DSH launch (default: `true`).

### 2. Mentions & DM Assistant
- **`mentionReplyEnabled`**: Automatically reply to @mentions and quote replies (default: `true`).
- **`dmReplyEnabled`**: Automatically reply to direct messages (default: `true`).
- **`replyQuote`**: Preserve Discord quote context when replying (default: `true`).
- **`roundCapPerUser`**: Maximum back-and-forth conversational rounds per user (default: `5`).
- **`maxDailyMentionReplies`**: Daily mention reply quota (default: `60`).
- **`maxDailyDmReplies`**: Daily DM reply quota (default: `60`).
- **`mentionPersonaPrompt`**: Custom persona prompt for mention responses.
- **`dmPersonaPrompt`**: Custom persona prompt for DM responses.

### 3. Autonomous Co-Chatting
- **`coChatEnabled`**: Enable group co-chatting (default: `true`).
- **`coChatProbability`**: Base probability of participating (`0~100%`, default: `25%`).
- **`coChatCooldownSeconds`**: Cooldown per channel before next interjection (seconds, default: `60`).
- **`coChatMinHistoryMessages`**: Minimum context messages accumulated before speaking (default: `3`).
- **`interestKeywords`**: List of interest keywords boosting participation likelihood (+35%).
- **`maxDailyCoChats`**: Maximum group interjections per day (default: `80`).
- **`coChatPersonaPrompt`**: Style prompt for group conversation (supports `[NO_REPLY]`).
- **`monitoredChannelIds`**: List of monitored channel IDs (empty means all permitted text channels).

### 4. LLM & Reasoning Engine
- **`llmMode`**: Inference mode (`auto`, `subscriptions` for DSH host credits, `custom` for external API).
- **`subscriptionProvider`**: DSH subscription provider (e.g., `antigravity`, `codex`, `grok`).
- **`subscriptionModel`**: Specific model identifier under the provider.
- **`customLlmApiKey`**: Custom API Key (OpenAI / DeepSeek compatible).
- **`customLlmApiBase`**: Custom API Base URL (e.g. `https://api.deepseek.com`).
- **`customLlmModel`**: Custom model name (e.g. `deepseek-chat`).

### 5. Anti-Ban Protections
- **`simulateTyping`**: Send typing state prior to message delivery (default: `true`).
- **`jitterMinSeconds`** / **`jitterMaxSeconds`**: Latency delay boundaries (default: `2~5` seconds).
- **`blacklistUserIds`**: Blacklisted user IDs.
- **`whitelistUserIds`**: Whitelisted user IDs (if non-empty, only interacts with these users).
- **`blacklistChannelIds`**: Blacklisted channel IDs.

---

## 🔑 How to Retrieve Your Discord User Token

1. Open [Discord Web](https://discord.com/app) in a desktop browser (Chrome / Edge).
2. Press `F12` or right-click and select **Inspect** to open Developer Tools.
3. Switch to the **Network** tab.
4. Send a message or click on any channel in the server sidebar.
5. Filter or select any Discord API request (e.g., `messages` or `typing`).
6. In **Headers** -> **Request Headers**, locate the **`authorization`** field.
7. Copy the token string (keep it secure; never share it with untrusted parties).

---

## 📜 Releases & Changelog

For version history and detailed change descriptions, see [CHANGELOG.md](CHANGELOG.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
