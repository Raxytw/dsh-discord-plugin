# DSH Discord User Assistant & MCP Plugin (`@luoyi-dsh/discord-plugin`)

<div align="center">

![DSH Discord Plugin Banner](assets/banner.png)

**[English](README.md) | [繁體中文](README.zh-Hant.md) | [Agent & Operational Guide](AGENTS.md)**

</div>

> A specialized smart assistant and Model Context Protocol (MCP) plugin designed for **Discord User Accounts (Selfbot)**.  
> Fully integrated into the DeepSeek Harness (DSH) ecosystem, featuring two autonomous engines: **Mention, Quote & DM Assistant** and **Autonomous Co-Chatting**, alongside a complete suite of **13 MCP tools** covering text, images, files, stickers, and emoji reactions.  
> Features native support for **DSH Platform Subscriptions (Antigravity, Codex, Grok)** for zero-API-key operation, and automatic seamless fallback when external API quotas are exhausted (HTTP 402 Insufficient Balance).

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
   - Compatible with custom OpenAI / DeepSeek API endpoints with **Automatic 402 Failover**.
6. **Premium Web Settings Dashboard (`client.js`)**:
   - Single-bundle browser UI featuring token masking, live connection tests, KPI progress gauges, and real-time message dispatchers.

---

## 🚀 Installation

```bash
# Via DSH Plugin CLI (Recommended)
dsh plugin --profile web add @luoyi-dsh/discord-plugin

# Or via NPM
npm install @luoyi-dsh/discord-plugin
```

---

## 📖 Operational Guide & Tool Reference

For complete MCP tool definitions, natural language prompts, HTTP REST API routes, SDK invocation examples, and configuration parameters, please refer to **[AGENTS.md](AGENTS.md)**.

---

## 📁 Directory Structure

```text
dsh-discord-plugin/
├── assets/
│   └── banner.png                 # Promotional banner
├── client.js                      # DSH Web UI dashboard
├── cordis.patch.yml               # DSH bundle patch manifest
├── package.json                   # Package metadata and dependencies
├── tsconfig.json                  # TypeScript compiler settings
├── AGENTS.md                      # Operational & Agent Tool Guide
├── CHANGELOG.md                   # Version release notes
├── README.md                      # English overview (This file)
├── README.zh-Hant.md              # Traditional Chinese overview
└── src/
    ├── index.ts                   # Cordis plugin entrypoint, Gateway dispatcher, and REST API
    ├── config.ts                  # Schemastery config schema
    ├── types.ts                   # TypeScript interfaces and types
    ├── mcp-server.ts              # Standalone MCP Stdio entrypoint
    ├── lib/                       # Selfbot client, state ledger, and unified LLM engine
    ├── duty/                      # Mention/DM assistant & autonomous co-chatting duties
    └── tools/                     # 13 standard Discord MCP tools
```

---

## 📜 Releases & License

- See [CHANGELOG.md](CHANGELOG.md) for release notes.
- Licensed under the [MIT License](LICENSE).
