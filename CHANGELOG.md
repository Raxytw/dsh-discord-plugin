# Changelog

All notable changes to `@luoyi-dsh/discord-plugin` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-10-28

### Added
- **DSH Subscriptions (Host LLM) Support**:
  - Added multi-tier LLM execution mode (`llmMode: 'auto' | 'subscriptions' | 'custom'`).
  - Seamlessly integrates with DSH platform subscription credits (Antigravity, Codex, Grok, Gemini, Claude) without requiring external third-party API keys.
- **Automatic Fallback on Insufficient Balance**:
  - Intercepts HTTP 402 / `Insufficient Balance` responses from custom LLM providers and automatically switches to authorized DSH host subscription models.
- **LLM Connection Testing**:
  - Added dedicated connection testing API and interactive test button directly in the Web UI dashboard to verify custom API keys or subscription tokens.
- **Immediate Client Mounting**:
  - Configured `client.immediately = true` in `package.json` for instant UI tab mounting upon web console launch.
- **Enhanced MCP Tool Rendering**:
  - Added structured text renderers for all 13 MCP tools for clear display in DSH chat streams.

### Changed
- Standardized Cordis bundle patch identifier to `@luoyi-dsh/discord-plugin`.
- Refined Web UI styles in `client.js` following design-taste specifications with toast notifications and KPI metrics.

---

## [1.0.1] - 2026-10-27

### Added
- Multi-language README documentation (English & Traditional Chinese).
- Anti-ban protections with customizable typing simulation jitter and user/channel whitelist/blacklist.

---

## [1.0.0] - 2026-10-27

### Initial Release
- **User Account Selfbot Engine**: Discord user account authentication with multi-presence status (online, idle, dnd, invisible) and HTTP/SOCKS5 proxy support.
- **Smart Mention & DM Assistant**: Automated reasoning and quoting responses with loop-preventing round caps.
- **Autonomous Co-Chatting**: Rolling message buffer, interest keyword weighting, probability gate, and `[NO_REPLY]` filtering.
- **Full MCP Toolset**: 13 standard Model Context Protocol tools for text, images, files, stickers, and reactions.
- **DSH Web Dashboard**: Native single-file web client for real-time monitoring and configuration.
