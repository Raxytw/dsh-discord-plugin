/**
 * src/lib/llm.ts —— 統一 LLM 推理調用模組 (支援 DSH ctx.llm 宿主服務與外部 API 備援)
 * ============================================================================
 */

import { DiscordPluginConfig } from '../types.js'

export async function callLlmForDiscord(
  ctx: any,
  config: DiscordPluginConfig,
  systemPrompt: string,
  userPrompt: string,
  log: (msg: string) => void = console.log
): Promise<string> {
  // 1. 優先嘗試 DSH 宿主注入的 ctx.llm 服務
  const llm = (typeof ctx?.get === 'function' ? ctx.get('llm') : undefined) || ctx?.llm
  if (llm) {
    try {
      if (typeof llm.chat === 'function') {
        const res = await llm.chat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        })
        const answer = res?.content || res?.text || (typeof res === 'string' ? res : '')
        if (answer && answer.trim()) return answer.trim()
      } else if (typeof llm.complete === 'function') {
        const res = await llm.complete(`${systemPrompt}\n\n${userPrompt}`)
        if (res && typeof res === 'string' && res.trim()) return res.trim()
      }
    } catch (e: any) {
      log(`⚠️ ctx.llm 調用異常: ${e.message}，轉為外部 API 備援`)
    }
  }

  // 2. 外部 API 備援 (使用者設定檔或環境變數)
  const apiKey = config.customLlmApiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
  const apiBase = (config.customLlmApiBase || process.env.DEEPSEEK_API_BASE || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com')
    .replace(/\/+$/, '')
  const model = config.customLlmModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (apiKey) {
    try {
      const resp = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      })

      if (resp.ok) {
        const data = (await resp.json()) as any
        const content = data.choices?.[0]?.message?.content || ''
        if (content && content.trim()) return content.trim()
      } else {
        const errText = await resp.text().catch(() => '')
        log(`外部 LLM API 請求失敗 (${resp.status}): ${errText}`)
      }
    } catch (err: any) {
      log(`外部 LLM API 連線異常: ${err.message}`)
    }
  }

  return '你好！已收到你的訊息，稍後為你詳述～'
}
