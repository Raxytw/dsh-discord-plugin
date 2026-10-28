/**
 * src/index.ts —— DSH Discord 插件核心入口 (Cordis Plugin)
 * ============================================================================
 * 職責：
 * 1. 導出標準 Cordis 插件結構 (name, inject, Config, apply)。
 * 2. 整合宿主 schemastery，提供 settings 面板 schema 渲染。
 * 3. 註冊 13 項 Discord MCP 操作工具至 DSH ctx.tools。
 * 4. 監聽 Gateway WebSocket 即時對話，調度 mentionReply (提及/私訊代回) 與 autoChat (群組穿插閒聊)。
 * 5. 透過 webServer.register 提供完整 REST API 供前端 client.js 讀寫與即時發送測試。
 * ============================================================================
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildConfigSchema, defaultConfig, sanitizeConfig } from './config.js'
import { DiscordPluginConfig } from './types.js'
import { loadSchemastery } from './lib/hostdeps.js'
import { DiscordClientWrapper } from './lib/discordClient.js'
import { DiscordLedgerManager } from './lib/ledger.js'
import { registerDiscordTools } from './tools/discordTools.js'
import { handleIncomingMessageForReply } from './duty/mentionReply.js'
import { handleIncomingMessageForCoChat } from './duty/autoChat.js'
import { testLlmConnection, getAuthorizedSubscriptionProviders } from './lib/llm.js'
import { getSocialFishMemoryStats } from './lib/companion.js'
export * from './lib/companion.js'

export * from './types.js'
export * from './config.js'
export * from './lib/discordClient.js'
export * from './lib/ledger.js'
export * from './tools/discordTools.js'
export * from './duty/mentionReply.js'
export * from './duty/autoChat.js'

export const name = 'discord-plugin'
export const inject = ['webServer', 'tools']

// 載入 schemastery
const zInstance = await loadSchemastery()
export const Config = buildConfigSchema(zInstance)

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: any) => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

// 全局單例共享機制
let sharedClient: DiscordClientWrapper | null = null
export function getSharedDiscordClient(): DiscordClientWrapper | null {
  return sharedClient || (globalThis as any).__DSH_DISCORD_CLIENT__ || null
}

export function apply(ctx: any, userConfig: Partial<DiscordPluginConfig> = {}) {
  const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  const dataDir = join(pluginRoot, 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const configFile = join(dataDir, 'config.json')
  const localSavedConfig = (() => {
    try {
      if (existsSync(configFile)) {
        return JSON.parse(readFileSync(configFile, 'utf-8'))
      }
    } catch {}
    return {}
  })()

  const activeConfig: DiscordPluginConfig = sanitizeConfig({
    ...defaultConfig,
    ...userConfig,
    ...localSavedConfig,
  })

  // 若 config.json 尚不存在，動態創建初始配置檔
  if (!existsSync(configFile)) {
    try {
      writeFileSync(configFile, JSON.stringify(activeConfig, null, 2), 'utf-8')
    } catch {}
  }

  const log = (msg: string) => {
    console.log(`[DSH-Discord] ${msg}`)
  }

  const saveConfig = (patch: Partial<DiscordPluginConfig>) => {
    const cleanPatch = sanitizeConfig(patch)
    Object.assign(activeConfig, cleanPatch)
    try {
      writeFileSync(configFile, JSON.stringify(activeConfig, null, 2), 'utf-8')
    } catch (e: any) {
      log(`保存 config.json 失敗: ${e.message}`)
    }
  }

  log(`Discord 插件初始化中... (路徑: ${pluginRoot})`)

  // 1. 初始化狀態帳本
  const ledger = new DiscordLedgerManager(join(dataDir, 'ledger.json'))

  // 2. 初始化核心客戶端 (先清理先前實例，避免 HMR 重複連線)
  if (sharedClient) {
    try {
      sharedClient.logout().catch(() => {})
    } catch {}
  }
  const client = new DiscordClientWrapper(log)
  sharedClient = client
  ;(globalThis as any).__DSH_DISCORD_CLIENT__ = client

  let isDisposed = false

  // 3. 綁定 Gateway 即時訊息監聽器
  client.onMessageCreate = async (rawMsg) => {
    if (isDisposed) return
    try {
      // 先判斷是否為指名私訊、提及或引用回覆
      const replied = await handleIncomingMessageForReply(ctx, activeConfig, client, ledger, rawMsg, log)
      if (!replied) {
        // 若非提及，評估是否主動穿插聊天
        await handleIncomingMessageForCoChat(ctx, activeConfig, client, ledger, rawMsg, log)
      }
    } catch (err: any) {
      log(`事件調度異常: ${err.message}`)
    }
  }

  // 4. 註冊 MCP / DSH Tools
  registerDiscordTools(
    ctx,
    () => client,
    () => ledger,
    () => activeConfig,
    log
  )

  // 5. 若配置了使用者 Token 且啟用 autoStart，進行自動連線
  if (activeConfig.autoStart && activeConfig.userToken) {
    client.login(activeConfig.userToken, activeConfig.proxyUrl).then((status) => {
      if (status.ok && activeConfig.status) {
        client.setPresenceStatus(activeConfig.status)
      }
    }).catch((err) => {
      log(`自動連線失敗: ${err.message}`)
    })
  }

  // ============================================================================
  // REST API 路由 (供前端面板 client.js 使用)
  // ============================================================================
  const handleRequest = async (req: any, res: any) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      const pathname = url.pathname

      // 讀取配置
      if (req.method === 'GET' && pathname === '/api/discord/config') {
        return sendJson(res, 200, { ok: true, config: sanitizeConfig(activeConfig) })
      }

      // 更新配置
      if (req.method === 'POST' && pathname === '/api/discord/config') {
        const body = await readBody(req)
        saveConfig(body)
        if (body.status && client.isReady) {
          client.setPresenceStatus(body.status)
        }
        return sendJson(res, 200, { ok: true, config: sanitizeConfig(activeConfig) })
      }

      // 取得運行狀態
      if (req.method === 'GET' && pathname === '/api/discord/status') {
        return sendJson(res, 200, {
          ok: true,
          status: client.getStatus(),
          dailyStats: ledger.getDailyStats(),
          feiyuMood: getSocialFishMemoryStats('social_dc_').moodSnapshot,
          fishMemory: {
            isolated: true,
            storeFilePrefix: '~/.dsh/fish-memory/social_dc_*.json',
          },
        })
      }

      // 登入
      if (req.method === 'POST' && pathname === '/api/discord/login') {
        const body = await readBody(req)
        const token = body.token || activeConfig.userToken
        const proxy = body.proxyUrl || activeConfig.proxyUrl
        if (!token) {
          return sendJson(res, 400, { ok: false, error: '請提供 Discord 使用者 Token' })
        }
        const status = await client.login(token, proxy)
        if (status.ok) {
          saveConfig({ userToken: token, proxyUrl: proxy })
          if (activeConfig.status) client.setPresenceStatus(activeConfig.status)
        }
        return sendJson(res, 200, { ok: status.ok, status })
      }

      // 登出
      if (req.method === 'POST' && pathname === '/api/discord/logout') {
        await client.logout()
        return sendJson(res, 200, { ok: true, status: client.getStatus() })
      }

      // 伺服器清單
      if (req.method === 'GET' && pathname === '/api/discord/guilds') {
        return sendJson(res, 200, { ok: true, guilds: client.getGuilds() })
      }

      // 頻道清單
      if (req.method === 'GET' && pathname === '/api/discord/channels') {
        const guildId = url.searchParams.get('guildId') || undefined
        return sendJson(res, 200, { ok: true, channels: client.getChannels(guildId) })
      }

      // 私訊清單
      if (req.method === 'GET' && pathname === '/api/discord/dms') {
        return sendJson(res, 200, { ok: true, dms: client.getDMs() })
      }

      // 貼圖清單
      if (req.method === 'GET' && pathname === '/api/discord/stickers') {
        const q = url.searchParams.get('q') || undefined
        return sendJson(res, 200, { ok: true, stickers: client.searchStickers(q) })
      }

      // 歷史訊息
      if (req.method === 'GET' && pathname === '/api/discord/messages') {
        const channelId = url.searchParams.get('channelId')
        const limit = Number(url.searchParams.get('limit')) || 15
        if (!channelId) {
          return sendJson(res, 400, { ok: false, error: '缺少 channelId 參數' })
        }
        const msgs = await client.getMessages(channelId, limit)
        return sendJson(res, 200, msgs)
      }

      // 測試發送
      if (req.method === 'POST' && pathname === '/api/discord/send') {
        const body = await readBody(req)
        const { channelId, type, content, imagePath, filePath, stickerId, replyToMessageId } = body
        if (!channelId) {
          return sendJson(res, 400, { ok: false, error: '未指定目標頻道或使用者 ID' })
        }

        let sendRes: any
        if (type === 'image' && imagePath) {
          sendRes = await client.sendImage(channelId, imagePath, content, { replyToMessageId })
        } else if (type === 'file' && filePath) {
          sendRes = await client.sendFile(channelId, filePath, content, { replyToMessageId })
        } else if (type === 'sticker' && stickerId) {
          sendRes = await client.sendSticker(channelId, stickerId)
        } else {
          sendRes = await client.sendMessage(channelId, content || '測試發送訊息', {
            replyToMessageId,
            simulateTyping: activeConfig.simulateTyping,
          })
        }
        return sendJson(res, sendRes.ok ? 200 : 400, sendRes)
      }

      // 取得 DSH 已授權之訂閱模型清單 (dsh-plugin-subscriptions)
      if (req.method === 'GET' && pathname === '/api/discord/subscriptions') {
        const providers = getAuthorizedSubscriptionProviders()
        return sendJson(res, 200, { ok: true, providers })
      }

      // 測試 LLM 模型連線
      if (req.method === 'POST' && pathname === '/api/discord/test-llm') {
        const body = await readBody(req)
        const testConfig = {
          ...activeConfig,
          llmMode: body.llmMode || activeConfig.llmMode || 'auto',
          subscriptionProvider: body.subscriptionProvider || activeConfig.subscriptionProvider,
          subscriptionModel: body.subscriptionModel || activeConfig.subscriptionModel,
          customLlmApiKey: body.apiKey !== undefined ? body.apiKey : activeConfig.customLlmApiKey,
          customLlmApiBase: body.apiBase || activeConfig.customLlmApiBase || 'https://api.deepseek.com',
          customLlmModel: body.model || activeConfig.customLlmModel || 'deepseek-chat',
        }

        const testRes = await testLlmConnection(ctx, testConfig, log)
        return sendJson(res, testRes.ok ? 200 : 400, testRes)
      }

      sendJson(res, 404, { ok: false, error: `Not found: ${pathname}` })
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message })
    }
  }

  ;(globalThis as any).__DSH_DISCORD_REQUEST_HANDLER__ = handleRequest

  const webServer = (typeof ctx.get === 'function' ? ctx.get('webServer') : undefined) || ctx.webServer
  if (!(globalThis as any).__DSH_DISCORD_ROUTES_REGISTERED__ && webServer) {
    try {
      const dynamicDispatcher = (req: any, res: any) => {
        const fn = (globalThis as any).__DSH_DISCORD_REQUEST_HANDLER__
        if (typeof fn === 'function') return fn(req, res)
        return handleRequest(req, res)
      }

      if (typeof webServer.register === 'function') {
        webServer.register({
          kind: 'prefix',
          path: '/api/discord',
          handler: dynamicDispatcher,
        })
        ;(globalThis as any).__DSH_DISCORD_ROUTES_REGISTERED__ = true
        log('✅ 已註冊 DSH 官方路由: /api/discord')
      } else if (webServer.router) {
        webServer.router.all('/api/discord/*', dynamicDispatcher)
        ;(globalThis as any).__DSH_DISCORD_ROUTES_REGISTERED__ = true
      }
    } catch (e: any) {
      log(`註冊 Web 路由異常: ${e.message}`)
    }
  }

  // 優雅卸載
  const dispose = async () => {
    isDisposed = true
    if (client) {
      await client.logout().catch(() => {})
      sharedClient = null
      ;(globalThis as any).__DSH_DISCORD_CLIENT__ = null
    }
    log('插件已成功卸載。')
  }

  if (typeof ctx?.on === 'function') {
    ctx.on('dispose', dispose)
  }
}

export default {
  name,
  inject,
  Config,
  apply,
}
