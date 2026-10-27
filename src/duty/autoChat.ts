/**
 * src/duty/autoChat.ts —— 自行接收大家的聊天訊息穿插進來一起聊天 (Autonomous Co-Chatting)
 * ============================================================================
 * 職責：
 * 1. 即時監聽關注頻道之成員對話，維持上下文滾動緩衝區。
 * 2. 智慧評估插嘴時機：結合興趣關鍵字權重、提問探測、冷卻時間與隨機率判定。
 * 3. 呼叫大語言模型以極致自然隨性、具備真實人類口吻的風格穿插搭話或吐槽。
 * 4. 具備 [NO_REPLY] 自覺放棄機制與全自動擬真人類輸入（sendTyping）防封號延遲。
 * ============================================================================
 */

import { DiscordPluginConfig } from '../types.js'
import { DiscordClientWrapper } from '../lib/discordClient.js'
import { DiscordLedgerManager } from '../lib/ledger.js'
import { callLlmForDiscord } from '../lib/llm.js'

export async function handleIncomingMessageForCoChat(
  ctx: any,
  config: DiscordPluginConfig,
  client: DiscordClientWrapper,
  ledger: DiscordLedgerManager,
  rawMsg: any,
  log: (msg: string) => void = console.log
): Promise<boolean> {
  if (!config.coChatEnabled || !client.isReady) return false

  const currentUser = client.currentUser
  if (!currentUser) return false

  const myId = currentUser.id
  const authorId = rawMsg.author?.id
  const isBot = Boolean(rawMsg.author?.bot)
  const channelId = rawMsg.channelId
  const guildId = rawMsg.guildId
  const content = (rawMsg.content || '').trim()

  // 1. 忽略自身、Bot 與私訊 (DM 由 mentionReply 處裡)
  if (!authorId || authorId === myId || isBot) return false
  if (rawMsg.channel.type === 'DM' || !guildId) return false

  // 2. 監聽頻道與伺服器過濾
  if (config.blacklistChannelIds && config.blacklistChannelIds.includes(channelId)) return false
  if (config.blacklistUserIds && config.blacklistUserIds.includes(authorId)) return false

  if (config.monitoredChannelIds && config.monitoredChannelIds.length > 0) {
    if (!config.monitoredChannelIds.includes(channelId)) return false
  }
  if (config.monitoredGuildIds && config.monitoredGuildIds.length > 0) {
    if (!config.monitoredGuildIds.includes(guildId)) return false
  }

  // 3. 檢查頻道冷卻時間 (避免在同一個頻道連珠炮插話引人反感)
  if (!ledger.canChannelChat(channelId, config.coChatCooldownSeconds)) {
    return false
  }

  // 4. 檢查每日主動發言上限
  if (!ledger.canDoDaily('coChats', config.maxDailyCoChats)) {
    return false
  }

  // 5. 檢查對話歷史豐富度 (至少需要有幾則發言才插嘴，避免空頻尷尬)
  const history = client.getChannelHistory(channelId, 10)
  if (history.length < Math.max(2, config.coChatMinHistoryMessages || 3)) {
    return false
  }

  // 6. 機率與興趣加權評估 (Intelligent Co-Chatting Evaluation)
  let probability = Math.max(0, Math.min(100, config.coChatProbability ?? 25))

  // 關鍵字興趣加權
  const lowerContent = content.toLowerCase()
  const matchedKeyword = (config.interestKeywords || []).find((kw) =>
    kw && lowerContent.includes(kw.toLowerCase())
  )
  if (matchedKeyword) {
    probability += 35
  }

  // 提問探測加權 (有人在群裡問問題時，更容易主動搭話幫忙)
  if (/[?？]$/.test(content) || /有人知道|為什麼|怎麼辦|求推薦|問一下/.test(content)) {
    probability += 25
  }

  const roll = Math.random() * 100
  if (roll > probability) {
    return false
  }

  log(`[CoChat] 頻道 ${rawMsg.channel.name || channelId} 觸發穿插搭話判定 (機率: ${probability}%, 擲骰: ${roll.toFixed(1)}%)`)

  // 7. 組裝上下文提示詞
  const contextLines = history
    .map((m) => `[${m.author.username}]: ${m.content}`)
    .join('\n')

  const systemPrompt = config.coChatPersonaPrompt || '你是一個在 Discord 群裡隨意聊天的好友，說話簡潔幽默自然。'
  const userPrompt = `【群組近期對話紀錄】：
${contextLines}

【最新發言】：[${rawMsg.author?.username}]: ${content}

請根據大家剛才的討論氛圍，以群友身分自然地穿插插嘴聊天（長話短說，20~50 字內，像真人打字，嚴禁任何 AI 客服語氣）。
若你覺得這段對話太嚴肅、私密或完全不適合插話，請直接回覆 '[NO_REPLY]'：`

  try {
    const response = await callLlmForDiscord(ctx, config, systemPrompt, userPrompt, log)
    if (!response || response.trim() === '[NO_REPLY]') {
      log(`[CoChat] AI 自行研判當前對話不宜插嘴，已放棄發言`)
      return false
    }

    // 8. 擬真人打字延遲 (Jitter)
    const minDelay = Math.max(1, config.jitterMinSeconds || 2)
    const maxDelay = Math.max(minDelay, config.jitterMaxSeconds || 4)
    const jitterSec = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    log(`[CoChat] 準備在頻道 #${rawMsg.channel.name || channelId} 插話: "${response}" (打字延遲: ${jitterSec}s)`)

    // 9. 發布發言
    const res = await client.sendMessage(channelId, response, {
      simulateTyping: config.simulateTyping,
      jitterSeconds: jitterSec,
    })

    if (res.ok) {
      ledger.recordChannelChat(channelId)
      ledger.incrementDaily('coChats')
      ledger.markSeenMessage(rawMsg.id, { channelId, userId: authorId, type: 'co_chat' })
      log(`[CoChat] ✅ 成功穿插聊天發言！`)
      return true
    } else {
      log(`[CoChat] ❌ 發送失敗: ${res.error}`)
      return false
    }
  } catch (err: any) {
    log(`[CoChat] 異常: ${err.message}`)
    return false
  }
}
