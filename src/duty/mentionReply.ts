/**
 * src/duty/mentionReply.ts —— 幫用戶回應內容：被提及、引用回覆與私訊智慧代回
 * ============================================================================
 */

import { DiscordPluginConfig } from '../types.js'
import { DiscordClientWrapper } from '../lib/discordClient.js'
import { DiscordLedgerManager } from '../lib/ledger.js'
import { callLlmForDiscord } from '../lib/llm.js'

export async function handleIncomingMessageForReply(
  ctx: any,
  config: DiscordPluginConfig,
  client: DiscordClientWrapper,
  ledger: DiscordLedgerManager,
  rawMsg: any,
  log: (msg: string) => void = console.log
): Promise<boolean> {
  const currentUser = client.currentUser
  if (!currentUser || !client.isReady) return false

  const myId = currentUser.id
  const authorId = rawMsg.author?.id
  const authorName = rawMsg.author?.username || '未知用戶'
  const isBot = Boolean(rawMsg.author?.bot)
  const channelId = rawMsg.channelId
  const messageId = rawMsg.id
  const content = (rawMsg.content || '').trim()

  // 1. 忽略自身發言與 Bot 訊息
  if (!authorId || authorId === myId || isBot) {
    return false
  }

  // 2. 判斷是否為私訊 (DM) 或是伺服器內提及/引用
  const isDm = rawMsg.channel.type === 'DM' || !rawMsg.guildId
  let isMentioned = false
  let isReplyToMe = false

  if (!isDm) {
    // 檢查是否有 @我
    if (rawMsg.mentions?.has(myId)) {
      isMentioned = true
    }

    // 檢查是否為回覆我的訊息 (Quote Reply)
    if (rawMsg.reference?.messageId) {
      try {
        const refMsg = await rawMsg.channel.messages.fetch(rawMsg.reference.messageId).catch(() => null)
        if (refMsg && refMsg.author?.id === myId) {
          isReplyToMe = true
        }
      } catch {}
    }
  }

  // 若兩者皆不是，代表不是指名給我的訊息，移交給 autoChat 處理
  if (!isDm && !isMentioned && !isReplyToMe) {
    return false
  }

  // 3. 檢查開關狀態
  if (isDm && !config.dmReplyEnabled) {
    return false
  }
  if (!isDm && !config.mentionReplyEnabled) {
    return false
  }

  // 4. 去重檢查
  if (ledger.hasSeenMessage(messageId)) {
    return false
  }

  // 5. 黑白名單檢查
  if (config.blacklistUserIds && config.blacklistUserIds.includes(authorId)) {
    log(`[MentionReply] 用戶 ${authorName} (${authorId}) 在黑名單中，忽略處理`)
    ledger.markSeenMessage(messageId, { channelId, userId: authorId, type: 'ignored' })
    return false
  }
  if (config.blacklistChannelIds && config.blacklistChannelIds.includes(channelId)) {
    return false
  }
  if (config.whitelistUserIds && config.whitelistUserIds.length > 0 && !config.whitelistUserIds.includes(authorId)) {
    log(`[MentionReply] 用戶 ${authorName} (${authorId}) 不在白名單中，跳過回覆`)
    ledger.markSeenMessage(messageId, { channelId, userId: authorId, type: 'ignored' })
    return false
  }

  // 6. 配額與輪數檢查 (Round Cap & Daily Cap)
  if (!ledger.canReplyToUser(authorId, config.roundCapPerUser)) {
    log(`[MentionReply] 對用戶 ${authorName} 已達單日對話輪數上限 (${config.roundCapPerUser} 輪)，暫停自動回覆`)
    ledger.markSeenMessage(messageId, { channelId, userId: authorId, type: 'round_cap_hit' })
    return false
  }

  const statKey = isDm ? 'dmReplies' : 'mentionReplies'
  const maxDaily = isDm ? config.maxDailyDmReplies : config.maxDailyMentionReplies
  if (!ledger.canDoDaily(statKey, maxDaily)) {
    log(`[MentionReply] 已達今日回覆上限 (${maxDaily} 則)`)
    ledger.markSeenMessage(messageId, { channelId, userId: authorId, type: 'daily_cap_hit' })
    return false
  }

  log(`[MentionReply] 收到來自 @${authorName} 的${isDm ? '私訊 (DM)' : '提及/回覆'}: "${content}"`)

  // 7. 取得該頻道上下文快取 (最近 8 則訊息)
  const history = client.getChannelHistory(channelId, 8)
  const contextText = history
    .map((m) => `[${m.author.username}]: ${m.content}`)
    .join('\n')

  const systemPrompt = isDm ? config.dmPersonaPrompt : config.mentionPersonaPrompt
  const userPrompt = `【對話環境】：${isDm ? 'Discord 私訊 (Direct Message)' : 'Discord 頻道公屏'}
【近期上下文對話紀錄】：
${contextText || '(無歷史紀錄)'}

【當前互動對象】：@${authorName}
【對方最新訊息】：${content || '(發送了附件或表情)'}

請以帳號本人的口吻給予簡潔、精準、自然的回答（字數控制在 100 字內，不要任何冗言贅字或生硬 AI 語氣）：`

  try {
    const answer = await callLlmForDiscord(ctx, config, systemPrompt, userPrompt, log)
    if (!answer || answer.trim() === '[NO_REPLY]') {
      ledger.markSeenMessage(messageId, { channelId, userId: authorId, type: 'no_reply' })
      return true
    }

    // 8. 擬真人打字延遲 (Jitter)
    const minDelay = Math.max(1, config.jitterMinSeconds || 2)
    const maxDelay = Math.max(minDelay, config.jitterMaxSeconds || 4)
    const jitterSec = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    // 9. 發送回覆
    if (isDm) {
      await client.sendMessage(channelId, answer, {
        simulateTyping: config.simulateTyping,
        jitterSeconds: jitterSec,
      })
    } else {
      if (config.replyQuote) {
        await client.replyMessage(channelId, messageId, answer, {
          mention: true,
          simulateTyping: config.simulateTyping,
          jitterSeconds: jitterSec,
        })
      } else {
        await client.sendMessage(channelId, answer, {
          simulateTyping: config.simulateTyping,
          jitterSeconds: jitterSec,
        })
      }
    }

    // 10. 更新帳本
    ledger.markSeenMessage(messageId, { channelId, userId: authorId, type: isDm ? 'dm' : 'mention' })
    ledger.incrementUserRound(authorId)
    ledger.incrementDaily(statKey)
    log(`[MentionReply] ✅ 已成功為用戶 @${authorName} 代回訊息！`)
    return true
  } catch (err: any) {
    log(`[MentionReply] ❌ 回覆生成或發送異常: ${err.message}`)
    return false
  }
}
