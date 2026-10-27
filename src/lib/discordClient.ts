/**
 * src/lib/discordClient.ts —— Discord 使用者帳號 (Selfbot) 核心控制器
 * ============================================================================
 * 職責：
 * 1. 使用 discord.js-selfbot-v13 維護使用者憑證連線與 Gateway WebSocket 狀態。
 * 2. 提供文字 (簡訊)、圖片、檔案文件、貼圖、表情符號發布介面。
 * 3. 支援即時 Gateway messageCreate 監聽，維護各頻道之對話滾動快取 (Buffer)。
 * 4. 具備擬真人發言機制：sendTyping 與可自訂 jitter 延遲。
 * ============================================================================
 */

import { existsSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import discordPkg from 'discord.js-selfbot-v13'
import {
  BufferedMessage,
  DiscordConnectionStatus,
  DiscordUserInfo,
  DiscordUserStatus,
  SendAttachmentOptions,
  SendMessageOptions,
} from '../types.js'

const { Client, MessageAttachment } = (discordPkg as any).default || discordPkg

export class DiscordClientWrapper {
  private client: any | null = null
  private userToken: string = ''
  private proxyUrl: string = ''
  private log: (msg: string) => void
  private isConnecting: boolean = false
  private connectionStatus: DiscordConnectionStatus = {
    ok: false,
    state: 'disconnected',
    message: '尚未連線',
  }

  // 各頻道滾動對話快取 (保留最近 30 則)
  private channelBuffers: Map<string, BufferedMessage[]> = new Map()

  // 監聽器回調
  public onMessageCreate?: (message: any, buffered: BufferedMessage) => Promise<void> | void

  constructor(log: (msg: string) => void = console.log) {
    this.log = log
  }

  public get isReady(): boolean {
    return Boolean(this.client && this.client.isReady() && this.connectionStatus.ok)
  }

  public get rawClient(): any {
    return this.client
  }

  public get currentUser(): any {
    return this.client?.user || null
  }

  public getStatus(): DiscordConnectionStatus {
    if (this.isReady && this.client?.user) {
      const u = this.client.user
      return {
        ok: true,
        state: 'connected',
        user: {
          id: u.id,
          tag: u.tag,
          username: u.username,
          globalName: u.globalName || u.username,
          avatarUrl: u.displayAvatarURL?.() || '',
          bot: Boolean(u.bot),
        },
        message: `已連線: @${u.username} (${u.tag})`,
        ping: this.client.ws?.ping ?? 0,
        guildCount: this.client.guilds?.cache?.size ?? 0,
      }
    }
    return { ...this.connectionStatus }
  }

  /**
   * 使用使用者 Token (非 Bot Token) 登入 Discord
   */
  public async login(token: string, proxyUrl?: string): Promise<DiscordConnectionStatus> {
    if (!token || !token.trim()) {
      this.connectionStatus = {
        ok: false,
        state: 'error',
        message: '未提供 Discord 使用者 Token',
      }
      return this.connectionStatus
    }

    if (this.isReady && this.userToken === token) {
      return this.getStatus()
    }

    if (this.isConnecting) {
      return {
        ok: false,
        state: 'connecting',
        message: '正在連線中，請稍候...',
      }
    }

    await this.logout().catch(() => {})

    this.isConnecting = true
    this.userToken = token.trim()
    this.proxyUrl = (proxyUrl || '').trim()

    this.connectionStatus = {
      ok: false,
      state: 'connecting',
      message: '正在連線 Discord Gateway...',
    }

    this.log(`開始以使用者憑證連線 Discord (Token: ${this.userToken.slice(0, 10)}...)...`)

    return new Promise((resolvePromise) => {
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          this.isConnecting = false
          this.connectionStatus = {
            ok: false,
            state: 'error',
            message: '連線超時 (30s)，請檢查網路或代理連線設定',
          }
          this.log(`❌ Discord 連線超時`)
          resolvePromise(this.connectionStatus)
        }
      }, 30000)

      try {
        const clientOptions: any = {
          checkUpdate: false,
          restRequestTimeout: 20000,
        }

        this.client = new Client(clientOptions)

        this.client.on('ready', () => {
          if (resolved) return
          resolved = true
          clearTimeout(timeout)
          this.isConnecting = false

          const u = this.client.user
          this.connectionStatus = {
            ok: true,
            state: 'connected',
            user: {
              id: u.id,
              tag: u.tag,
              username: u.username,
              globalName: u.globalName || u.username,
              avatarUrl: u.displayAvatarURL?.() || '',
              bot: Boolean(u.bot),
            },
            message: `成功登入 Discord: @${u.username}`,
            ping: this.client.ws?.ping ?? 0,
            guildCount: this.client.guilds?.cache?.size ?? 0,
          }
          this.log(`🎉 Discord 連線就緒！帳號: @${u.username} (${u.id})，加入 ${this.client.guilds?.cache?.size || 0} 個伺服器`)
          resolvePromise(this.connectionStatus)
        })

        this.client.on('error', (err: any) => {
          this.log(`⚠️ Discord 核心客戶端異常: ${err.message}`)
        })

        this.client.on('shardDisconnect', () => {
          this.log(`ℹ️ Discord Gateway 斷開連線`)
          if (this.connectionStatus.state === 'connected') {
            this.connectionStatus = {
              ok: false,
              state: 'disconnected',
              message: '連線已斷開',
            }
          }
        })

        // 即時訊息監聽與對話快取更新
        this.client.on('messageCreate', async (msg: any) => {
          try {
            const buffered = this.formatBufferedMessage(msg)
            this.pushBuffer(buffered)
            if (this.onMessageCreate) {
              await this.onMessageCreate(msg, buffered)
            }
          } catch (e: any) {
            this.log(`處理收到的訊息異常: ${e.message}`)
          }
        })

        // 登入
        this.client.login(this.userToken).catch((loginErr: any) => {
          if (resolved) return
          resolved = true
          clearTimeout(timeout)
          this.isConnecting = false
          this.connectionStatus = {
            ok: false,
            state: 'error',
            message: `登入失敗: ${loginErr.message || 'Token 無效或帳號遭安全鎖定'}`,
          }
          this.log(`❌ Discord 登入失敗: ${this.connectionStatus.message}`)
          resolvePromise(this.connectionStatus)
        })
      } catch (err: any) {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          this.isConnecting = false
          this.connectionStatus = {
            ok: false,
            state: 'error',
            message: `啟動失敗: ${err.message}`,
          }
          resolvePromise(this.connectionStatus)
        }
      }
    })
  }

  public async logout(): Promise<void> {
    if (this.client) {
      try {
        this.client.destroy()
      } catch {}
      this.client = null
    }
    this.isConnecting = false
    this.connectionStatus = {
      ok: false,
      state: 'disconnected',
      message: '已登出',
    }
  }

  public setPresenceStatus(status: DiscordUserStatus): void {
    if (!this.isReady || !this.client?.user) return
    try {
      this.client.user.setStatus(status)
    } catch (e: any) {
      this.log(`設定在線狀態異常: ${e.message}`)
    }
  }

  // ============================================================================
  // 對話快取管理 (Message Buffer)
  // ============================================================================

  private formatBufferedMessage(msg: any): BufferedMessage {
    const attachments = msg.attachments
      ? Array.from(msg.attachments.values()).map((att: any) => ({
          name: att.name || 'attachment',
          url: att.url || '',
          contentType: att.contentType || '',
        }))
      : []

    return {
      id: msg.id,
      channelId: msg.channelId,
      guildId: msg.guildId || undefined,
      author: {
        id: msg.author?.id || '',
        tag: msg.author?.tag || '',
        username: msg.author?.username || '未知用戶',
        bot: Boolean(msg.author?.bot),
      },
      content: msg.content || '',
      timestamp: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
      replyToId: msg.reference?.messageId || undefined,
      attachments,
    }
  }

  public pushBuffer(msg: BufferedMessage): void {
    const cid = msg.channelId
    if (!this.channelBuffers.has(cid)) {
      this.channelBuffers.set(cid, [])
    }
    const buf = this.channelBuffers.get(cid)!
    buf.push(msg)
    if (buf.length > 35) {
      buf.shift()
    }
  }

  public getChannelHistory(channelId: string, limit: number = 10): BufferedMessage[] {
    const buf = this.channelBuffers.get(channelId) || []
    return buf.slice(-Math.min(limit, buf.length))
  }

  // ============================================================================
  // 擬真人打字延遲 (Human-like Typing & Jitter)
  // ============================================================================

  private async sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }

  public async sendTyping(channel: any, durationMs: number = 2000): Promise<void> {
    try {
      if (typeof channel.sendTyping === 'function') {
        await channel.sendTyping().catch(() => {})
        if (durationMs > 0) {
          await this.sleep(durationMs)
        }
      }
    } catch {}
  }

  // ============================================================================
  // 取得目標 Channel 或 User DM 物件
  // ============================================================================

  public async resolveTargetChannel(channelOrUserId: string): Promise<any> {
    if (!this.isReady || !this.client) {
      throw new Error('Discord 客戶端未連線就緒')
    }

    const id = channelOrUserId.trim()
    // 1. 優先從已快取頻道搜尋
    let channel = this.client.channels.cache.get(id)
    if (channel) return channel

    // 2. 嘗試從 API Fetch 頻道
    try {
      channel = await this.client.channels.fetch(id)
      if (channel) return channel
    } catch {}

    // 3. 若為使用者 ID，開啟私訊頻道 (DM Channel)
    try {
      const user = await this.client.users.fetch(id)
      if (user) {
        const dm = await user.createDM()
        if (dm) return dm
      }
    } catch {}

    throw new Error(`找不到對應的頻道或使用者 ID: ${id}`)
  }

  // ============================================================================
  // 發送訊息 (傳簡訊 / 傳文字)
  // ============================================================================

  public async sendMessage(
    channelOrUserId: string,
    content: string,
    options: SendMessageOptions = {}
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    try {
      const channel = await this.resolveTargetChannel(channelOrUserId)

      if (options.simulateTyping !== false) {
        const delay = options.jitterSeconds ? options.jitterSeconds * 1000 : 2000
        await this.sendTyping(channel, delay)
      }

      let sentMsg: any
      if (options.replyToMessageId) {
        try {
          const targetMsg = await channel.messages.fetch(options.replyToMessageId)
          sentMsg = await targetMsg.reply({
            content,
            allowedMentions: { repliedUser: options.mention !== false },
          })
        } catch {
          // 若無法引用，直接發送
          sentMsg = await channel.send(content)
        }
      } else {
        sentMsg = await channel.send(content)
      }

      return { ok: true, messageId: sentMsg.id }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // ============================================================================
  // 回覆特定訊息
  // ============================================================================

  public async replyMessage(
    channelId: string,
    messageId: string,
    content: string,
    options: { mention?: boolean; simulateTyping?: boolean; jitterSeconds?: number } = {}
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    return this.sendMessage(channelId, content, {
      replyToMessageId: messageId,
      mention: options.mention,
      simulateTyping: options.simulateTyping,
      jitterSeconds: options.jitterSeconds,
    })
  }

  // ============================================================================
  // 發送圖片 (傳圖片)
  // ============================================================================

  public async sendImage(
    channelOrUserId: string,
    imagePathOrUrl: string,
    caption?: string,
    options: SendAttachmentOptions = {}
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    try {
      const channel = await this.resolveTargetChannel(channelOrUserId)

      if (options.simulateTyping !== false) {
        await this.sendTyping(channel, 2000)
      }

      let attachmentTarget: any = imagePathOrUrl
      // 若為本地相對路徑，轉為絕對路徑驗證
      if (!imagePathOrUrl.startsWith('http://') && !imagePathOrUrl.startsWith('https://')) {
        const absPath = isAbsolute(imagePathOrUrl) ? imagePathOrUrl : resolve(process.cwd(), imagePathOrUrl)
        if (!existsSync(absPath)) {
          return { ok: false, error: `本機圖片檔案不存在: ${absPath}` }
        }
        attachmentTarget = absPath
      }

      const payload: any = {
        files: [attachmentTarget],
      }
      if (caption || options.content) {
        payload.content = caption || options.content
      }

      let sentMsg: any
      if (options.replyToMessageId) {
        try {
          const targetMsg = await channel.messages.fetch(options.replyToMessageId)
          sentMsg = await targetMsg.reply(payload)
        } catch {
          sentMsg = await channel.send(payload)
        }
      } else {
        sentMsg = await channel.send(payload)
      }

      return { ok: true, messageId: sentMsg.id }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // ============================================================================
  // 發送文件/附件 (傳文件)
  // ============================================================================

  public async sendFile(
    channelOrUserId: string,
    filePathOrUrl: string,
    content?: string,
    options: SendAttachmentOptions = {}
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    return this.sendImage(channelOrUserId, filePathOrUrl, content, options)
  }

  // ============================================================================
  // 發送貼圖 (發貼圖)
  // ============================================================================

  public async sendSticker(
    channelOrUserId: string,
    stickerId: string
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    try {
      const channel = await this.resolveTargetChannel(channelOrUserId)
      const cleanId = stickerId.trim()
      const sentMsg = await channel.send({
        stickers: [cleanId],
      })
      return { ok: true, messageId: sentMsg.id }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // ============================================================================
  // 表情反應 (Reaction)
  // ============================================================================

  public async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const channel = await this.resolveTargetChannel(channelId)
      const msg = await channel.messages.fetch(messageId)
      await msg.react(emoji)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // ============================================================================
  // 讀取歷史訊息 (讀取聊天訊息)
  // ============================================================================

  public async getMessages(
    channelOrUserId: string,
    limit: number = 15
  ): Promise<{ ok: boolean; messages?: BufferedMessage[]; error?: string }> {
    try {
      const channel = await this.resolveTargetChannel(channelOrUserId)
      const fetched = await channel.messages.fetch({ limit: Math.min(50, Math.max(1, limit)) })
      const list = Array.from(fetched.values()).reverse().map((m: any) => this.formatBufferedMessage(m))
      return { ok: true, messages: list }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // ============================================================================
  // 查詢伺服器、頻道與私訊清單
  // ============================================================================

  public getGuilds(): Array<{ id: string; name: string; memberCount: number; iconUrl?: string }> {
    if (!this.isReady || !this.client) return []
    return Array.from(this.client.guilds.cache.values()).map((g: any) => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount || 0,
      iconUrl: g.iconURL?.() || '',
    }))
  }

  public getChannels(guildId?: string): Array<{ id: string; name: string; type: string; guildId?: string }> {
    if (!this.isReady || !this.client) return []
    let sourceChannels: any[] = []
    if (guildId) {
      const guild = this.client.guilds.cache.get(guildId)
      if (guild) sourceChannels = Array.from(guild.channels.cache.values())
    } else {
      sourceChannels = Array.from(this.client.channels.cache.values())
    }

    return sourceChannels
      .filter((c: any) => c.isText?.() || c.type === 'GUILD_TEXT' || c.type === 'DM')
      .map((c: any) => ({
        id: c.id,
        name: c.name || (c.recipient ? `DM: @${c.recipient.username}` : c.id),
        type: c.type || 'text',
        guildId: c.guildId || undefined,
      }))
  }

  public getDMs(): Array<{ id: string; recipient: { id: string; username: string; tag: string } }> {
    if (!this.isReady || !this.client) return []
    const dms: any[] = []
    for (const ch of this.client.channels.cache.values()) {
      if (ch.type === 'DM' && ch.recipient) {
        dms.push({
          id: ch.id,
          recipient: {
            id: ch.recipient.id,
            username: ch.recipient.username,
            tag: ch.recipient.tag,
          },
        })
      }
    }
    return dms
  }

  public searchStickers(query?: string): Array<{ id: string; name: string; guildName?: string }> {
    if (!this.isReady || !this.client) return []
    const results: any[] = []
    const q = (query || '').toLowerCase().trim()
    for (const guild of this.client.guilds.cache.values()) {
      if (!guild.stickers?.cache) continue
      for (const st of guild.stickers.cache.values()) {
        if (!q || st.name.toLowerCase().includes(q)) {
          results.push({
            id: st.id,
            name: st.name,
            guildName: guild.name,
          })
          if (results.length >= 25) return results
        }
      }
    }
    return results
  }
}
