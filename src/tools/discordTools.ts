/**
 * src/tools/discordTools.ts —— Discord MCP 標準工具集 (向 DSH Tools 與 MCP 伺服器註冊)
 * ============================================================================
 */

import { DiscordClientWrapper } from '../lib/discordClient.js'
import { DiscordLedgerManager } from '../lib/ledger.js'
import { DiscordPluginConfig } from '../types.js'

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute: (args: any) => Promise<any>
}

export function createDiscordToolDefinitions(
  getClient: () => DiscordClientWrapper | null,
  getLedger: () => DiscordLedgerManager | null,
  getConfig: () => DiscordPluginConfig,
  log: (msg: string) => void = console.log
): ToolDefinition[] {
  return [
    // 1. 檢查連線狀態
    {
      name: 'discord_check_status',
      description: '檢查 Discord 使用者帳號目前連線狀態、登入用戶資訊、所加入伺服器數量與今日互動統計。',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const client = getClient()
        const ledger = getLedger()
        return {
          connection: client?.getStatus() || { ok: false, state: 'disconnected', message: '未初始化' },
          dailyStats: ledger?.getDailyStats() || null,
        }
      },
    },

    // 2. 帳號登入與憑證切換
    {
      name: 'discord_login',
      description: '使用 Discord 使用者 Token (非 Bot Token) 進行登入連線或重新連接。',
      parameters: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Discord 使用者授權 Token' },
          proxy_url: { type: 'string', description: '可選的代理伺服器 URL (例如 http://127.0.0.1:7890)' },
        },
        required: ['token'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client) return { ok: false, error: 'Discord 核心客戶端尚未初始化' }
        return await client.login(args.token, args.proxy_url)
      },
    },

    // 3. 發送簡訊 / 文字訊息 (傳簡訊)
    {
      name: 'discord_send_message',
      description: '發送文字訊息 (簡訊/普通發言) 到指定的 Discord 頻道 ID 或直接傳送給指定的使用者私訊 (DM)。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '目標文字頻道 ID 或目標使用者 ID (若為使用者 ID 則發送私訊)' },
          content: { type: 'string', description: '欲發送之文字內容' },
          simulate_typing: { type: 'boolean', description: '是否在發言前模擬真人正在輸入中 (預設 true)' },
        },
        required: ['channel_id', 'content'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.sendMessage(args.channel_id, args.content, {
          simulateTyping: args.simulate_typing !== false,
        })
      },
    },

    // 4. 回覆特定訊息
    {
      name: 'discord_reply_message',
      description: '指定回覆某條訊息 (附帶 Discord 引用格式)。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '頻道 ID' },
          message_id: { type: 'string', description: '欲回覆的目標訊息 ID' },
          content: { type: 'string', description: '回覆的文字內容' },
          mention: { type: 'boolean', description: '回覆時是否 @提及對方 (預設 true)' },
        },
        required: ['channel_id', 'message_id', 'content'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.replyMessage(args.channel_id, args.message_id, args.content, {
          mention: args.mention !== false,
        })
      },
    },

    // 5. 傳送圖片 (傳圖片)
    {
      name: 'discord_send_image',
      description: '發送圖片至指定頻道或私訊 (支援本機檔案絕對路徑、相對路徑或公開網路圖片 URL，可附帶圖說文字)。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '目標頻道 ID 或使用者 ID' },
          image_path_or_url: { type: 'string', description: '本機圖片檔案路徑 (例如 C:/images/photo.png) 或 HTTP 圖片網址' },
          caption: { type: 'string', description: '圖片說明文字 / 附言 (可選)' },
          reply_to_message_id: { type: 'string', description: '指定回覆之訊息 ID (可選)' },
        },
        required: ['channel_id', 'image_path_or_url'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.sendImage(args.channel_id, args.image_path_or_url, args.caption, {
          replyToMessageId: args.reply_to_message_id,
        })
      },
    },

    // 6. 傳送文件 / 附件 (傳文件)
    {
      name: 'discord_send_file',
      description: '發送文件或附件 (PDF、DOCX、ZIP、文字檔、代碼檔等) 至頻道或私訊。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '目標頻道 ID 或使用者 ID' },
          file_path: { type: 'string', description: '本機檔案路徑' },
          content: { type: 'string', description: '伴隨文件之說明訊息 (可選)' },
          reply_to_message_id: { type: 'string', description: '指定回覆之訊息 ID (可選)' },
        },
        required: ['channel_id', 'file_path'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.sendFile(args.channel_id, args.file_path, args.content, {
          replyToMessageId: args.reply_to_message_id,
        })
      },
    },

    // 7. 發送貼圖 (發貼圖)
    {
      name: 'discord_send_sticker',
      description: '在指定頻道發送 Discord 貼圖 (Sticker)。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '目標頻道 ID' },
          sticker_id: { type: 'string', description: '貼圖 ID (可先透過 discord_search_stickers 查詢)' },
        },
        required: ['channel_id', 'sticker_id'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.sendSticker(args.channel_id, args.sticker_id)
      },
    },

    // 8. 表情符號反應 (Emoji Reaction)
    {
      name: 'discord_add_reaction',
      description: '為指定訊息添加 Emoji 表情反應 (例如 👍, ❤️, 🔥, 或自訂表情符號)。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '頻道 ID' },
          message_id: { type: 'string', description: '目標訊息 ID' },
          emoji: { type: 'string', description: 'Emoji 表情符號字元或名稱' },
        },
        required: ['channel_id', 'message_id', 'emoji'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.addReaction(args.channel_id, args.message_id, args.emoji)
      },
    },

    // 9. 讀取聊天訊息 (歷史記錄)
    {
      name: 'discord_get_messages',
      description: '讀取特定頻道或私訊之最新歷史聊天訊息 (供 AI 理解對話脈絡或提取資訊)。',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: '目標頻道 ID 或使用者 ID' },
          limit: { type: 'number', description: '讀取訊息筆數上限 (預設 15，最大 50)' },
        },
        required: ['channel_id'],
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return await client.getMessages(args.channel_id, args.limit || 15)
      },
    },

    // 10. 查詢伺服器清單
    {
      name: 'discord_list_guilds',
      description: '列出目前登入帳號已加入的所有 Discord 伺服器 (Guilds)。',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return { ok: true, guilds: client.getGuilds() }
      },
    },

    // 11. 查詢頻道清單
    {
      name: 'discord_list_channels',
      description: '列出指定伺服器或全帳號可存取的文字頻道清單。',
      parameters: {
        type: 'object',
        properties: {
          guild_id: { type: 'string', description: '可選的特定伺服器 ID (留空則列出已快取之文字頻道)' },
        },
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return { ok: true, channels: client.getChannels(args?.guild_id) }
      },
    },

    // 12. 查詢私訊清單
    {
      name: 'discord_list_dms',
      description: '列出最近開啟的私訊 (Direct Messages) 對象清單。',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return { ok: true, dms: client.getDMs() }
      },
    },

    // 13. 搜尋貼圖
    {
      name: 'discord_search_stickers',
      description: '搜尋此帳號加入之伺服器內可用的貼圖清單。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜尋關鍵字 (例如 貓, 哭, 讚，可選)' },
        },
      },
      execute: async (args: any) => {
        const client = getClient()
        if (!client || !client.isReady) return { ok: false, error: 'Discord 帳號未連線就緒' }
        return { ok: true, stickers: client.searchStickers(args?.query) }
      },
    },
  ]
}

export function registerDiscordTools(
  ctx: any,
  getClient: () => DiscordClientWrapper | null,
  getLedger: () => DiscordLedgerManager | null,
  getConfig: () => DiscordPluginConfig,
  log: (msg: string) => void = console.log
): void {
  const tools = (typeof ctx.get === 'function' ? ctx.get('tools') : undefined) || ctx.tools
  const defs = createDiscordToolDefinitions(getClient, getLedger, getConfig, log)

  for (const toolDef of defs) {
    const enriched = {
      ...toolDef,
      output: {
        schema: { type: 'object' },
      },
    }
    try {
      if (typeof tools?.define === 'function') {
        tools.define(enriched)
      } else if (typeof tools?.register === 'function') {
        tools.register(enriched)
      } else if (typeof ctx?.tool === 'function') {
        ctx.tool(enriched)
      }
    } catch (e: any) {
      log(`註冊工具 ${toolDef.name} 失敗: ${e.message}`)
    }
  }

  log(`✅ 已向 DSH Tools 註冊 13 個 Discord MCP 操作工具！`)
}
