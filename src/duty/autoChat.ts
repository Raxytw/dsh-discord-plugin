/**
 * src/duty/autoChat.ts —— 自行接收大家的聊天訊息穿插進來一起聊天 (Autonomous Co-Chatting)
 * ============================================================================
 * 職責：
 * 1. 即時監聽關注頻道之成員對話，維持上下文滾動緩衝區。
 * 2. 智慧評估插嘴時機：結合興趣關鍵字權重、提問探測、冷卻時間與隨機率判定。
 * 3. 【防 Prompt 注入】：過濾含有注入指令的頻道訊息並以 <untrusted_external_content> 封裝。
 * 4. 【去 AI 味第一條件】：強制套用 ANTI_AI_FLAVOR_PRIMARY_RULE 與後處理清洗。
 * 5. 【兼容 dsh-feiyu-mood 與 dsh-fish-memory 隔離記憶庫】：自然帶入心情指標與頻道互動記憶。
 * ============================================================================
 */

import { DiscordPluginConfig } from '../types.js'
import { DiscordClientWrapper } from '../lib/discordClient.js'
import { DiscordLedgerManager } from '../lib/ledger.js'
import { callLlmForDiscord } from '../lib/llm.js'
import {
  ANTI_AI_FLAVOR_PRIMARY_RULE,
  PROMPT_INJECTION_DEFENSE_RULE,
  buildFeiyuMoodPromptBlock,
  inspectAndSanitizeUntrustedInput,
  recallSocialMemories,
  recordSocialInteractionMemory,
  stripAiFlavorArtifacts,
  wrapUntrustedContent,
} from '../lib/companion.js'

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

  // 2.5 防 Prompt 注入攔截
  const injectionCheck = inspectAndSanitizeUntrustedInput(content)
  if (injectionCheck.isInjection) {
    return false
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
  const matchedKeyword = (config.interestKeywords || []).find(
    (kw) => kw && lowerContent.includes(kw.toLowerCase())
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

  // 7. 組裝上下文提示詞（整合去 AI 味第一條件、防注入、dsh-feiyu-mood 與 dsh-fish-memory 隔離庫）
  const contextLines = history
    .map((m) => `[${m.author.username}]: ${inspectAndSanitizeUntrustedInput(m.content).sanitizedText}`)
    .join('\n')

  const moodBlock = buildFeiyuMoodPromptBlock()
  const chMemoryBlock = recallSocialMemories('dc', 'ch', channelId, injectionCheck.sanitizedText, 3)

  const basePersona =
    config.coChatPersonaPrompt || '你是一個在 Discord 群裡隨意聊天的好友，說話簡潔幽默自然。'
  const systemPrompt = `${ANTI_AI_FLAVOR_PRIMARY_RULE}

${PROMPT_INJECTION_DEFENSE_RULE}

【角色人設】：
${basePersona}
${moodBlock ? `\n${moodBlock}` : ''}
${chMemoryBlock ? `\n${chMemoryBlock}` : ''}`

  const userPrompt = `【群組近期對話紀錄】：
${wrapUntrustedContent('channel_history', contextLines)}

【最新發言】：
${wrapUntrustedContent('latest_message', `[${rawMsg.author?.username}]: ${injectionCheck.sanitizedText}`)}

請嚴格遵守【第一條件：對話絕對不要 AI 味】，根據大家剛才的討論氛圍，以群友身分自然地穿插插嘴聊天（長話短說，15~45 字內，像真人打字，嚴禁任何 AI 客服語氣）。
若你覺得這段對話太嚴肅、私密或完全不適合插話，請直接回覆 '[NO_REPLY]'：`

  try {
    const rawResponse = await callLlmForDiscord(ctx, config, systemPrompt, userPrompt, log)
    const response = stripAiFlavorArtifacts(rawResponse)
    if (!response || response === '[NO_REPLY]' || response.startsWith('[系統提示]')) {
      log(`[CoChat] AI 自行研判當前對話不宜插嘴或未配置金鑰，已放棄發言`)
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
      recordSocialInteractionMemory({
        platform: 'dc',
        channelType: 'ch',
        targetUser: channelId,
        userMessage: `@${rawMsg.author?.username || '群友'}: ${injectionCheck.sanitizedText}`,
        botReply: response,
        contextNote: `DC頻道(#${rawMsg.channel?.name || channelId})`,
      })
      log(`[CoChat] ✅ 成功穿插聊天發言並同步至隔離記憶庫！`)
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
