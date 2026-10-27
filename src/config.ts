/**
 * src/config.ts —— Discord 插件設定與 Schemastery 模型
 * ============================================================================
 */

import { DiscordPluginConfig } from './types.js'

export const defaultConfig: DiscordPluginConfig = {
  enabled: true,
  userToken: '',
  proxyUrl: '',
  autoStart: true,
  status: 'online',

  // 1. 被提及與私訊代回
  mentionReplyEnabled: true,
  dmReplyEnabled: true,
  roundCapPerUser: 5,
  maxDailyMentionReplies: 60,
  maxDailyDmReplies: 60,
  mentionPersonaPrompt: '你是一個熱情、友善且精通各類技術與話題的 Discord 好友。回答請簡明扼要、語氣親切自然，長話短說（100字內），嚴禁生硬 AI 腔。',
  dmPersonaPrompt: '你現在代表帳號本人私訊回覆。語氣自然隨和、誠懇，簡短回覆（100字內），有問必答。',
  replyQuote: true,

  // 2. 穿插進來一起聊天 (Autonomous Co-Chatting)
  coChatEnabled: true,
  monitoredChannelIds: [],
  monitoredGuildIds: [],
  coChatProbability: 25,
  coChatCooldownSeconds: 60,
  coChatMinHistoryMessages: 3,
  coChatPersonaPrompt: '你現在扮演 Discord 群組裡的一位活躍玩家朋友。說話隨和幽默、口語化、精簡有力（20-60字左右）。可以吐槽、開玩笑、分享想法或接梗。絕不要說『作為 AI』或『很高興為您服務』。如果你覺得現在對話不適合搭話，請只回覆 [NO_REPLY]。',
  interestKeywords: ['ai', '遊戲', 'code', 'bug', '吃什麼', '推薦', '伺服器', '更新'],
  maxDailyCoChats: 80,

  // 3. 安全與防封號
  simulateTyping: true,
  jitterMinSeconds: 2,
  jitterMaxSeconds: 5,
  blacklistUserIds: [],
  whitelistUserIds: [],
  blacklistChannelIds: [],

  // 4. 自訂 LLM
  customLlmApiKey: '',
  customLlmApiBase: 'https://api.deepseek.com',
  customLlmModel: 'deepseek-chat',
}

export function unwrapValue<T = any>(val: any, fallback?: T): T {
  if (val === null || val === undefined) return fallback as T
  if (val === '[object Object]') return fallback as T
  if (typeof val === 'object' && typeof val.get === 'function') {
    const v = val.get()
    return (v !== undefined && v !== null && typeof v !== 'object') ? v : (fallback as T)
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    return fallback as T
  }
  return val as T
}

export function sanitizeConfig(raw: any): DiscordPluginConfig {
  const src = raw || {}
  const cleanStr = (k: string, fb = ''): string => {
    const v = unwrapValue(src[k], fb)
    return typeof v === 'string' ? v.trim() : fb
  }
  const cleanBool = (k: string, fb = false): boolean => {
    const v = unwrapValue(src[k], fb)
    return typeof v === 'boolean' ? v : fb
  }
  const cleanNum = (k: string, fb = 0): number => {
    const v = unwrapValue(src[k], fb)
    const n = Number(v)
    return isNaN(n) ? fb : n
  }
  const cleanArr = (k: string, fb: string[] = []): string[] => {
    const v: any = unwrapValue(src[k], fb)
    if (Array.isArray(v)) {
      return v.map((x: any) => String(unwrapValue(x, '')).trim()).filter(Boolean)
    }
    if (typeof v === 'string' && v.trim()) {
      return v.split(',').map((x: string) => x.trim()).filter(Boolean)
    }
    return fb
  }

  return {
    enabled: cleanBool('enabled', defaultConfig.enabled),
    userToken: cleanStr('userToken', defaultConfig.userToken),
    proxyUrl: cleanStr('proxyUrl', defaultConfig.proxyUrl),
    autoStart: cleanBool('autoStart', defaultConfig.autoStart),
    status: (['online', 'idle', 'dnd', 'invisible'].includes(cleanStr('status')) 
      ? cleanStr('status') 
      : defaultConfig.status) as any,

    mentionReplyEnabled: cleanBool('mentionReplyEnabled', defaultConfig.mentionReplyEnabled),
    dmReplyEnabled: cleanBool('dmReplyEnabled', defaultConfig.dmReplyEnabled),
    roundCapPerUser: cleanNum('roundCapPerUser', defaultConfig.roundCapPerUser),
    maxDailyMentionReplies: cleanNum('maxDailyMentionReplies', defaultConfig.maxDailyMentionReplies),
    maxDailyDmReplies: cleanNum('maxDailyDmReplies', defaultConfig.maxDailyDmReplies),
    mentionPersonaPrompt: cleanStr('mentionPersonaPrompt', defaultConfig.mentionPersonaPrompt),
    dmPersonaPrompt: cleanStr('dmPersonaPrompt', defaultConfig.dmPersonaPrompt),
    replyQuote: cleanBool('replyQuote', defaultConfig.replyQuote),

    coChatEnabled: cleanBool('coChatEnabled', defaultConfig.coChatEnabled),
    monitoredChannelIds: cleanArr('monitoredChannelIds', defaultConfig.monitoredChannelIds),
    monitoredGuildIds: cleanArr('monitoredGuildIds', defaultConfig.monitoredGuildIds),
    coChatProbability: cleanNum('coChatProbability', defaultConfig.coChatProbability),
    coChatCooldownSeconds: cleanNum('coChatCooldownSeconds', defaultConfig.coChatCooldownSeconds),
    coChatMinHistoryMessages: cleanNum('coChatMinHistoryMessages', defaultConfig.coChatMinHistoryMessages),
    coChatPersonaPrompt: cleanStr('coChatPersonaPrompt', defaultConfig.coChatPersonaPrompt),
    interestKeywords: cleanArr('interestKeywords', defaultConfig.interestKeywords),
    maxDailyCoChats: cleanNum('maxDailyCoChats', defaultConfig.maxDailyCoChats),

    simulateTyping: cleanBool('simulateTyping', defaultConfig.simulateTyping),
    jitterMinSeconds: cleanNum('jitterMinSeconds', defaultConfig.jitterMinSeconds),
    jitterMaxSeconds: cleanNum('jitterMaxSeconds', defaultConfig.jitterMaxSeconds),
    blacklistUserIds: cleanArr('blacklistUserIds', defaultConfig.blacklistUserIds),
    whitelistUserIds: cleanArr('whitelistUserIds', defaultConfig.whitelistUserIds),
    blacklistChannelIds: cleanArr('blacklistChannelIds', defaultConfig.blacklistChannelIds),

    customLlmApiKey: cleanStr('customLlmApiKey', defaultConfig.customLlmApiKey),
    customLlmApiBase: cleanStr('customLlmApiBase', defaultConfig.customLlmApiBase),
    customLlmModel: cleanStr('customLlmModel', defaultConfig.customLlmModel),
  }
}

export function buildConfigSchema(zInstance: any) {
  if (!zInstance || typeof zInstance.object !== 'function') {
    return undefined
  }
  const z = zInstance
  return z.object({
    enabled: z.boolean().default(true).description('是否啟用 Discord 插件').extra('volatile', true),
    userToken: z.string().role('secret').default('').description('Discord 使用者 Token (非 Bot Token)').extra('volatile', true),
    proxyUrl: z.string().default('').description('代理伺服器 URL (可選，例如 http://127.0.0.1:7890)').extra('volatile', true),
    autoStart: z.boolean().default(true).description('啟動 DSH 時是否自動連線').extra('volatile', true),
    status: z.union([
      z.const('online').description('在線 (Online)'),
      z.const('idle').description('閒置 (Idle)'),
      z.const('dnd').description('請勿打擾 (DND)'),
      z.const('invisible').description('隱身 (Invisible)'),
    ]).default('online').description('在線狀態').extra('volatile', true),

    mentionReplyEnabled: z.boolean().default(true).description('是否自動回覆被 @提及 或 引用回覆').extra('volatile', true),
    dmReplyEnabled: z.boolean().default(true).description('是否自動代回私訊 (DM)').extra('volatile', true),
    roundCapPerUser: z.number().default(5).description('單一對象連續回覆輪數上限 (防無窮對話)').extra('volatile', true),
    maxDailyMentionReplies: z.number().default(60).description('每日被提及回覆上限').extra('volatile', true),
    maxDailyDmReplies: z.number().default(60).description('每日私訊回覆上限').extra('volatile', true),
    mentionPersonaPrompt: z.string().role('textarea').default(defaultConfig.mentionPersonaPrompt).description('提及回覆人設 Prompt').extra('volatile', true),
    dmPersonaPrompt: z.string().role('textarea').default(defaultConfig.dmPersonaPrompt).description('私訊代回人設 Prompt').extra('volatile', true),
    replyQuote: z.boolean().default(true).description('回覆時是否保留 Discord 引用格式').extra('volatile', true),

    coChatEnabled: z.boolean().default(true).description('是否啟用群組自然穿插閒聊 (Autonomous Co-Chat)').extra('volatile', true),
    monitoredChannelIds: z.array(z.string()).default([]).description('監聽的特定頻道 ID 清單 (留空則監聽有權限的所有文字頻道)').extra('volatile', true),
    monitoredGuildIds: z.array(z.string()).default([]).description('監聽的特定伺服器 ID 清單').extra('volatile', true),
    coChatProbability: z.number().default(25).description('聊天穿插機率 (0~100%)').extra('volatile', true),
    coChatCooldownSeconds: z.number().default(60).description('同頻道插嘴冷卻時間 (秒)').extra('volatile', true),
    coChatMinHistoryMessages: z.number().default(3).description('發言前最少累積之歷史訊息數').extra('volatile', true),
    coChatPersonaPrompt: z.string().role('textarea').default(defaultConfig.coChatPersonaPrompt).description('穿插聊天人設 Prompt').extra('volatile', true),
    interestKeywords: z.array(z.string()).default(defaultConfig.interestKeywords).description('觸發興趣關鍵字清單').extra('volatile', true),
    maxDailyCoChats: z.number().default(80).description('每日主動穿插聊天發言上限').extra('volatile', true),

    simulateTyping: z.boolean().default(true).description('發言前是否模擬正在輸入 (sendTyping) 防封號').extra('volatile', true),
    jitterMinSeconds: z.number().default(2).description('擬真延遲下限 (秒)').extra('volatile', true),
    jitterMaxSeconds: z.number().default(5).description('擬真延遲上限 (秒)').extra('volatile', true),
    blacklistUserIds: z.array(z.string()).default([]).description('黑名單用戶 ID 清單').extra('volatile', true),
    whitelistUserIds: z.array(z.string()).default([]).description('白名單用戶 ID 清單 (非空時僅回覆白名單)').extra('volatile', true),
    blacklistChannelIds: z.array(z.string()).default([]).description('黑名單頻道 ID 清單').extra('volatile', true),

    customLlmApiKey: z.string().role('secret').default('').description('自訂 LLM API Key (選填，未填時使用宿主 LLM)').extra('volatile', true),
    customLlmApiBase: z.string().default('https://api.deepseek.com').description('自訂 LLM Base URL').extra('volatile', true),
    customLlmModel: z.string().default('deepseek-chat').description('自訂 LLM 模型名稱').extra('volatile', true),
  })
}
