/**
 * src/types.ts —— Discord 用戶端 (Selfbot) 插件型態定義
 * ============================================================================
 */

export type DiscordUserStatus = 'online' | 'idle' | 'dnd' | 'invisible'

export interface DiscordUserInfo {
  id: string
  tag: string
  username: string
  globalName?: string
  avatarUrl?: string
  bot: boolean
}

export interface DiscordConnectionStatus {
  ok: boolean
  state: 'disconnected' | 'connecting' | 'connected' | 'error'
  user?: DiscordUserInfo
  message: string
  ping?: number
  guildCount?: number
}

export interface BufferedMessage {
  id: string
  channelId: string
  guildId?: string
  author: {
    id: string
    tag: string
    username: string
    bot: boolean
  }
  content: string
  timestamp: string
  replyToId?: string
  attachments?: Array<{
    name: string
    url: string
    contentType?: string
  }>
}

export interface DiscordPluginConfig {
  enabled: boolean
  userToken: string
  proxyUrl?: string
  autoStart: boolean
  status: DiscordUserStatus

  // 1. 被提及與私訊代回 (Mention & DM Assistant)
  mentionReplyEnabled: boolean
  dmReplyEnabled: boolean
  roundCapPerUser: number
  maxDailyMentionReplies: number
  maxDailyDmReplies: number
  mentionPersonaPrompt: string
  dmPersonaPrompt: string
  replyQuote: boolean

  // 2. 自行接收大家的聊天訊息穿插進來一起聊天 (Autonomous Co-Chatting)
  coChatEnabled: boolean
  monitoredChannelIds: string[]
  monitoredGuildIds: string[]
  coChatProbability: number
  coChatCooldownSeconds: number
  coChatMinHistoryMessages: number
  coChatPersonaPrompt: string
  interestKeywords: string[]
  maxDailyCoChats: number

  // 3. 防封號與擬真人類行為 (Safety & Anti-Ban)
  simulateTyping: boolean
  jitterMinSeconds: number
  jitterMaxSeconds: number
  blacklistUserIds: string[]
  whitelistUserIds: string[]
  blacklistChannelIds: string[]

  // 4. 自訂 LLM 配置（備援）
  customLlmApiKey?: string
  customLlmApiBase?: string
  customLlmModel?: string
}

export interface SendMessageOptions {
  replyToMessageId?: string
  mention?: boolean
  simulateTyping?: boolean
  jitterSeconds?: number
}

export interface SendAttachmentOptions {
  content?: string
  replyToMessageId?: string
  simulateTyping?: boolean
}
