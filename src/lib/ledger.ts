/**
 * src/lib/ledger.ts —— Discord 狀態帳本與頻次/冷卻控制
 * ============================================================================
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface DiscordDailyStats {
  date: string
  mentionReplies: number
  dmReplies: number
  coChats: number
  userDms: Record<string, number>
}

export interface DiscordLedgerState {
  seenMessages: Record<string, { timestamp: string; channelId?: string; userId?: string; type?: string }>
  userReplyRounds: Record<string, number>
  channelCooldowns: Record<string, number>
  dailyStats: DiscordDailyStats
}

export class DiscordLedgerManager {
  private filePath: string
  private state: DiscordLedgerState

  constructor(ledgerPath: string = 'data/ledger.json') {
    this.filePath = ledgerPath
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true })
      } catch {}
    }
    this.state = this.load()
    if (!existsSync(this.filePath)) {
      this.save()
    }
  }

  private getTodayString(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private load(): DiscordLedgerState {
    const today = this.getTodayString()
    const defaultState: DiscordLedgerState = {
      seenMessages: {},
      userReplyRounds: {},
      channelCooldowns: {},
      dailyStats: {
        date: today,
        mentionReplies: 0,
        dmReplies: 0,
        coChats: 0,
        userDms: {},
      },
    }

    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8').trim()
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<DiscordLedgerState>
          const loaded: DiscordLedgerState = {
            seenMessages: parsed.seenMessages || {},
            userReplyRounds: parsed.userReplyRounds || {},
            channelCooldowns: parsed.channelCooldowns || {},
            dailyStats: parsed.dailyStats || defaultState.dailyStats,
          }
          if (!loaded.dailyStats.userDms) loaded.dailyStats.userDms = {}
          this.checkRollover(loaded)
          return loaded
        }
      }
    } catch (err) {
      console.warn(`[DiscordLedger] 讀取狀態帳本警告:`, err)
    }

    return defaultState
  }

  private checkRollover(targetState: DiscordLedgerState = this.state): boolean {
    const today = this.getTodayString()
    if (targetState.dailyStats.date !== today) {
      targetState.dailyStats = {
        date: today,
        mentionReplies: 0,
        dmReplies: 0,
        coChats: 0,
        userDms: {},
      }
      targetState.userReplyRounds = {}
      return true
    }
    return false
  }

  public save(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      this.checkRollover()
      const content = JSON.stringify(this.state, null, 2)
      const tmpPath = `${this.filePath}.tmp`
      writeFileSync(tmpPath, content, 'utf-8')
      renameSync(tmpPath, this.filePath)
    } catch (err) {
      console.error(`[DiscordLedger] 儲存帳本異常:`, err)
    }
  }

  // 1. 訊息去重
  public hasSeenMessage(messageId: string): boolean {
    return Boolean(this.state.seenMessages[messageId])
  }

  public markSeenMessage(
    messageId: string,
    meta: { channelId?: string; userId?: string; type?: string } = {}
  ): void {
    this.state.seenMessages[messageId] = {
      timestamp: new Date().toISOString(),
      ...meta,
    }
    // 控制記錄上限避免過度膨脹 (保留最近 2000 筆)
    const keys = Object.keys(this.state.seenMessages)
    if (keys.length > 2500) {
      const toDelete = keys.slice(0, keys.length - 2000)
      for (const k of toDelete) delete this.state.seenMessages[k]
    }
    this.save()
  }

  // 2. 用戶連續對話輪數限制 (Round Cap)
  public getUserReplyRound(userId: string): number {
    return this.state.userReplyRounds[userId] || 0
  }

  public canReplyToUser(userId: string, roundCap: number): boolean {
    if (roundCap <= 0) return true
    return (this.state.userReplyRounds[userId] || 0) < roundCap
  }

  public incrementUserRound(userId: string): number {
    const next = (this.state.userReplyRounds[userId] || 0) + 1
    this.state.userReplyRounds[userId] = next
    this.save()
    return next
  }

  // 3. 頻道冷卻時間 (Channel Cooldown)
  public canChannelChat(channelId: string, cooldownSeconds: number): boolean {
    if (cooldownSeconds <= 0) return true
    const lastTime = this.state.channelCooldowns[channelId] || 0
    const now = Date.now()
    return now - lastTime >= cooldownSeconds * 1000
  }

  public recordChannelChat(channelId: string): void {
    this.state.channelCooldowns[channelId] = Date.now()
    this.save()
  }

  // 4. 每日上限統計
  public canDoDaily(type: 'mentionReplies' | 'dmReplies' | 'coChats', cap: number): boolean {
    this.checkRollover()
    if (cap <= 0) return true
    return (this.state.dailyStats[type] || 0) < cap
  }

  public incrementDaily(type: 'mentionReplies' | 'dmReplies' | 'coChats'): number {
    this.checkRollover()
    this.state.dailyStats[type] = (this.state.dailyStats[type] || 0) + 1
    this.save()
    return this.state.dailyStats[type]
  }

  public getDailyStats(): DiscordDailyStats {
    this.checkRollover()
    return { ...this.state.dailyStats }
  }
}
