/**
 * src/lib/llm.ts —— 統一 LLM 推理調用模組
 * ============================================================================
 * 支援功能：
 * 1. 🌟 調用 DSH 宿主及 dsh-plugin-subscriptions 授權之平台訂閱額度 (免 API Key，直接使用 Google Antigravity / OpenAI Codex / xAI Grok)
 * 2. 🔑 自訂外部 API (DeepSeek、OpenAI、Groq、矽基流動與本地 Ollama)
 * 3. ⚡ 自動偵測與降級 (自訂 API 餘額不足 402 時自動無縫切換至平台訂閱模型)
 * ============================================================================
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DiscordPluginConfig } from '../types.js'

export interface SubscriptionProviderInfo {
  provider: string
  label: string
  accounts: string[]
  defaultModel: string
  models: string[]
}

/**
 * 讀取 ~/.dsh/plugins/subscriptions/auth.json 查看是否有已授權的平台訂閱
 */
export function getAuthorizedSubscriptionProviders(): SubscriptionProviderInfo[] {
  try {
    const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
    const authPath = join(home, 'plugins', 'subscriptions', 'auth.json')
    if (existsSync(authPath)) {
      const data = JSON.parse(readFileSync(authPath, 'utf-8'))
      const list: SubscriptionProviderInfo[] = []

      if (data.antigravity && Object.keys(data.antigravity.accounts || {}).length > 0) {
        list.push({
          provider: 'antigravity',
          label: 'Google Antigravity (Gemini 2.5 Flash / Claude)',
          accounts: Object.keys(data.antigravity.accounts),
          defaultModel: 'gemini-2.5-flash',
          models: ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-2.5-pro', 'claude-sonnet-5-5-medium'],
        })
      }
      if (data.codex && Object.keys(data.codex.accounts || {}).length > 0) {
        list.push({
          provider: 'codex',
          label: 'OpenAI Codex (ChatGPT Plus)',
          accounts: Object.keys(data.codex.accounts),
          defaultModel: 'gpt-5.6-terra',
          models: ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-6-luna'],
        })
      }
      if (data.grok && Object.keys(data.grok.accounts || {}).length > 0) {
        list.push({
          provider: 'grok',
          label: 'xAI Grok (X Premium)',
          accounts: Object.keys(data.grok.accounts),
          defaultModel: 'grok-4.5',
          models: ['grok-4.5', 'grok-4.6', 'grok-4.7'],
        })
      }
      if (data.copilot && Object.keys(data.copilot.accounts || {}).length > 0) {
        list.push({
          provider: 'copilot',
          label: 'GitHub Copilot',
          accounts: Object.keys(data.copilot.accounts),
          defaultModel: 'gpt-4o',
          models: ['gpt-4o', 'claude-3.5-sonnet'],
        })
      }
      return list
    }
  } catch {}
  return []
}

/**
 * 依序自動探索可用之 API Key：
 * 1. 插件設定檔自定義 customLlmApiKey
 * 2. 環境變數 DEEPSEEK_API_KEY / OPENAI_API_KEY / GROQ_API_KEY / SILICONFLOW_API_KEY
 * 3. ~/.dsh/.credentials.yaml 中儲存的 DEEPSEEK_API_KEY / OPENAI_API_KEY
 */
export function resolveApiKey(config: DiscordPluginConfig): string {
  if (config.customLlmApiKey && config.customLlmApiKey.trim()) {
    return config.customLlmApiKey.trim()
  }

  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim()) {
    return process.env.DEEPSEEK_API_KEY.trim()
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    return process.env.OPENAI_API_KEY.trim()
  }
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    return process.env.GROQ_API_KEY.trim()
  }
  if (process.env.SILICONFLOW_API_KEY && process.env.SILICONFLOW_API_KEY.trim()) {
    return process.env.SILICONFLOW_API_KEY.trim()
  }

  // 嘗試從 ~/.dsh/.credentials.yaml 讀取
  try {
    const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
    const credPath = join(home, '.credentials.yaml')
    if (existsSync(credPath)) {
      const content = readFileSync(credPath, 'utf-8')
      const m1 = content.match(/DEEPSEEK_API_KEY:\s*([^\r\n#]+)/)
      if (m1 && m1[1] && m1[1].trim()) return m1[1].trim()
      const m2 = content.match(/OPENAI_API_KEY:\s*([^\r\n#]+)/)
      if (m2 && m2[1] && m2[1].trim()) return m2[1].trim()
    }
  } catch {}

  return ''
}

export function getSubscriptionAuthPath(): string {
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
  return join(home, 'plugins', 'subscriptions', 'auth.json')
}

/**
 * 直接透過 dsh-plugin-subscriptions 授權之 Google Antigravity Token 進行調用 (雙重保險，免重啟 DSH 即時可用)
 */
export async function callAntigravityDirect(
  model: string = 'gemini-2.5-flash',
  systemPrompt: string,
  userPrompt: string,
  log: (msg: string) => void = console.log
): Promise<string> {
  const authPath = getSubscriptionAuthPath()
  if (!existsSync(authPath)) throw new Error('未找到 subscriptions 授權檔案')
  const auth = JSON.parse(readFileSync(authPath, 'utf-8'))
  if (!auth.antigravity) throw new Error('未授權 Google Antigravity 平台')

  const accountKey = auth.antigravity.default || Object.keys(auth.antigravity.accounts || {})[0]
  const session = auth.antigravity.accounts?.[accountKey]
  if (!session) throw new Error('未找到可用的 Antigravity 帳戶 Session')

  // 若 Token 即將過期且有配置 OAuth client，自動嘗試透過 Google OAuth 刷新
  const oauthClientId = process.env.GOOGLE_CLIENT_ID || session.clientId
  const oauthClientSecret = process.env.GOOGLE_CLIENT_SECRET || session.clientSecret
  if (oauthClientId && oauthClientSecret && session.expiresAt && Date.now() > session.expiresAt - 60000 && session.refreshToken) {
    try {
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: oauthClientId,
          client_secret: oauthClientSecret,
          refresh_token: session.refreshToken,
          grant_type: 'refresh_token',
        }),
      })
      if (tokenResp.ok) {
        const tokenData = await tokenResp.json() as any
        session.accessToken = tokenData.access_token
        session.expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000
        auth.antigravity.accounts[accountKey] = session
        writeFileSync(authPath, JSON.stringify(auth, null, 2), 'utf-8')
      }
    } catch (e: any) {
      log(`[Antigravity] Token refresh 異常: ${e.message}`)
    }
  }

  const payload: any = {
    project: session.projectId || 'aicode-consumers',
    requestId: `agent/${Date.now()}/${randomUUID()}/4`,
    model: model || 'gemini-2.5-flash',
    userAgent: 'antigravity',
    requestType: 'agent',
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      sessionId: randomUUID(),
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    },
  }
  if (systemPrompt && systemPrompt.trim()) {
    payload.request.systemInstruction = { parts: [{ text: systemPrompt.trim() }] }
  }

  // 嘗試端點 (先試 daily 避開 429，再試 prod)
  const endpoints = ['https://daily-cloudcode-pa.googleapis.com', 'https://cloudcode-pa.googleapis.com']
  let lastErr = ''
  for (const endpoint of endpoints) {
    try {
      const resp = await fetch(`${endpoint}/v1internal:generateContent`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.accessToken}`,
          'content-type': 'application/json',
          'user-agent': 'antigravity/1.104.0 dsh-plugin-subscriptions',
        },
        body: JSON.stringify(payload),
      })
      if (resp.ok) {
        const data = await resp.json() as any
        const candidate = data.response?.candidates?.[0] || data.candidates?.[0]
        const parts = candidate?.content?.parts || []
        const textParts = parts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text)
        const full = textParts.join('\n').trim()
        if (full) return full
      } else {
        lastErr = await resp.text()
      }
    } catch (err: any) {
      lastErr = err.message
    }
  }
  throw new Error(`Google Antigravity API 連線未成功: ${lastErr}`)
}

/**
 * 透過本機 auth.json 授權之 Grok (xAI) Session 進行直連推理
 */
export async function callGrokDirect(
  model: string = 'grok-4.5',
  systemPrompt: string,
  userPrompt: string,
  log: (msg: string) => void = console.log
): Promise<string> {
  const authPath = getSubscriptionAuthPath()
  if (!existsSync(authPath)) throw new Error('dsh-plugin-subscriptions auth.json 不存在')

  const auth = JSON.parse(readFileSync(authPath, 'utf-8'))
  if (!auth.grok) throw new Error('未授權 xAI Grok (X Premium) 平台')

  const accountKey = auth.grok.default || Object.keys(auth.grok.accounts || {})[0]
  const session = auth.grok.accounts?.[accountKey]
  if (!session?.accessToken) throw new Error('未找到可用的 Grok 帳戶 Access Token')

  const input: any[] = []
  if (systemPrompt && systemPrompt.trim()) {
    input.push({ role: 'system', content: systemPrompt.trim() })
  }
  input.push({ role: 'user', content: userPrompt })

  const resp = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      model: model || 'grok-4.5',
      input,
    }),
  })

  if (resp.ok) {
    const data = (await resp.json()) as any
    const message = data.output?.find((o: any) => o.type === 'message' || o.role === 'assistant')
    const textPart = message?.content?.find((c: any) => c.type === 'output_text' || typeof c.text === 'string')
    const text = textPart?.text || ''
    if (text.trim()) return text.trim()
  }

  const errText = await resp.text().catch(() => '')
  throw new Error(`xAI Grok API 呼叫失敗 (${resp.status}): ${errText}`)
}

/**
 * 透過 DSH 宿主 ctx.llm (包含 dsh-plugin-subscriptions 註冊之適配器) 進行模型推理
 */
export async function callLlmViaHost(
  ctx: any,
  provider: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  log: (msg: string) => void = console.log
): Promise<string> {
  const llm = (typeof ctx?.get === 'function' ? ctx.get('llm') : undefined) || ctx?.llm

  // 1. 若宿主 ctx.llm 存在，優先走標準 Cordis 適配器調度
  if (llm) {
    try {
      let prepared: any
      let base: any = { provider, model, maxTokens: 2048 }

      if (typeof llm.resolveCallConfig === 'function') {
        base = await llm.resolveCallConfig({ provider, model, maxTokens: 2048 })
      }
      if (typeof llm.prepareCall === 'function') {
        prepared = await llm.prepareCall(base)
      }

      const streamTarget = prepared || llm
      const messages: any[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ]

      const options: any = {
        ...base,
        provider,
        model,
        messages,
      }
      if (systemPrompt && systemPrompt.trim()) {
        options.system = systemPrompt.trim()
      }

      let fullText = ''
      for await (const chunk of streamTarget.stream(options)) {
        if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
          fullText += chunk.text
        } else if (chunk.type === 'finish') {
          if (chunk.reason?.kind === 'error') {
            throw new Error(chunk.reason.failure?.message || 'LLM 推理生成失敗')
          }
        }
      }

      if (fullText.trim()) {
        return fullText.trim()
      }
    } catch (err: any) {
      log(`[Discord-LLM] ctx.llm 調用回報: ${err.message}，轉為底層訂閱直連`)
    }
  }

  // 2. 底層直連備援
  if (provider === 'grok') {
    return await callGrokDirect(model, systemPrompt, userPrompt, log)
  }
  if (provider === 'antigravity') {
    return await callAntigravityDirect(model, systemPrompt, userPrompt, log)
  }

  throw new Error(`DSH 宿主尚未注入 llm 服務，且無支援的直連適配器 (${provider})`)
}

/**
 * 透過自訂外部 OpenAI 相容 API 進行模型調用
 */
export async function callCustomLlmApi(
  config: DiscordPluginConfig,
  systemPrompt: string,
  userPrompt: string,
  log: (msg: string) => void = console.log
): Promise<string> {
  const apiKey = resolveApiKey(config)
  const apiBase = (config.customLlmApiBase || process.env.DEEPSEEK_API_BASE || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com')
    .replace(/\/+$/, '')
  const model = config.customLlmModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey || 'ollama'}`,
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
    throw new Error('模型返回空內容')
  }

  const errText = await resp.text().catch(() => '')
  const is402 = resp.status === 402 || errText.includes('insufficient_balance') || errText.includes('Insufficient Balance')
  if (is402) {
    const err = new Error('帳戶餘額不足 (402 Insufficient Balance)')
    ;(err as any).status = 402
    ;(err as any).isInsufficientBalance = true
    throw err
  }
  throw new Error(`API 請求失敗 (${resp.status}): ${errText}`)
}

/**
 * 測試自訂外部 API 連線
 */
async function testCustomLlmApi(
  config: DiscordPluginConfig,
  log: (msg: string) => void = console.log
): Promise<{ ok: boolean; answer?: string; error?: string; status?: number; isInsufficientBalance?: boolean; providerUsed?: string }> {
  const apiKey = resolveApiKey(config)
  const apiBase = (config.customLlmApiBase || process.env.DEEPSEEK_API_BASE || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
  const model = config.customLlmModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const isLocalEndpoint = apiBase.includes('localhost') || apiBase.includes('127.0.0.1')
  if (!apiKey && !isLocalEndpoint) {
    return {
      ok: false,
      error: '尚未配置 LLM API Key。請填寫 API 金鑰，或切換為「DSH 平台訂閱額度 (Subscriptions)」免金鑰模式。',
    }
  }

  try {
    const answer = await callCustomLlmApi(
      config,
      '請簡短回覆。',
      '請簡短回覆一句話（10字以內）：連線測試成功',
      log
    )
    return { ok: true, answer, providerUsed: `自訂 API: ${model} (${apiBase})` }
  } catch (err: any) {
    return {
      ok: false,
      status: err.status,
      error: err.message,
      isInsufficientBalance: err.isInsufficientBalance || false,
      providerUsed: `自訂 API: ${model}`,
    }
  }
}

/**
 * 測試 LLM 模型連線 (支援 Subscriptions 與 自訂 API)
 */
export async function testLlmConnection(
  ctx: any,
  config: DiscordPluginConfig,
  log: (msg: string) => void = console.log
): Promise<{ ok: boolean; answer?: string; error?: string; status?: number; isInsufficientBalance?: boolean; providerUsed?: string }> {
  const mode = config.llmMode || 'auto'
  const customKey = resolveApiKey(config)
  const authProviders = getAuthorizedSubscriptionProviders()

  const useSubscriptions = mode === 'subscriptions' || (mode === 'auto' && !customKey)

  if (useSubscriptions) {
    const targetProvider = config.subscriptionProvider || authProviders[0]?.provider || 'antigravity'
    const targetModel = config.subscriptionModel || (targetProvider === 'codex' ? 'gpt-5.6-terra' : targetProvider === 'grok' ? 'grok-4.5' : 'gemini-2.5-flash')
    log(`[Discord-LLM] 正在測試 DSH 平台訂閱連線: ${targetProvider} / ${targetModel}`)

    try {
      const answer = await callLlmViaHost(
        ctx,
        targetProvider,
        targetModel,
        '請簡短回覆。',
        '請簡短回覆一句話（10字以內）：連線測試成功',
        log
      )
      return { ok: true, answer, providerUsed: `DSH 訂閱平台: ${targetProvider} (${targetModel})` }
    } catch (err: any) {
      log(`[Discord-LLM] 訂閱連線失敗: ${err.message}`)
      return {
        ok: false,
        error: `DSH 訂閱平台 (${targetProvider} / ${targetModel}) 測試失敗: ${err.message}`,
        providerUsed: `DSH 訂閱平台: ${targetProvider}`,
      }
    }
  }

  return testCustomLlmApi(config, log)
}

/**
 * 核心業務推理解析入口 (自動支援 Subscriptions、自訂金鑰與故障無縫降級)
 */
export async function callLlmForDiscord(
  ctx: any,
  config: DiscordPluginConfig,
  systemPrompt: string,
  userPrompt: string,
  log: (msg: string) => void = console.log
): Promise<string> {
  const mode = config.llmMode || 'auto'
  const customKey = resolveApiKey(config)
  const authProviders = getAuthorizedSubscriptionProviders()

  // 1. 判斷是否優先使用 DSH 平台訂閱額度 (Subscriptions)
  const shouldTrySubscriptionsFirst = mode === 'subscriptions' || (mode === 'auto' && !customKey)

  if (shouldTrySubscriptionsFirst) {
    const targetProvider = config.subscriptionProvider || authProviders[0]?.provider || 'antigravity'
    const targetModel = config.subscriptionModel || (targetProvider === 'codex' ? 'gpt-5.6-terra' : targetProvider === 'grok' ? 'grok-4.5' : 'gemini-2.5-flash')

    log(`[Discord-LLM] 嘗試調用 DSH 訂閱平台額度 [${targetProvider} / ${targetModel}]...`)
    try {
      const result = await callLlmViaHost(ctx, targetProvider, targetModel, systemPrompt, userPrompt, log)
      if (result && result.trim()) {
        log(`[Discord-LLM] ✅ 成功透過 DSH 訂閱模型 (${targetProvider}) 生成回覆`)
        return result.trim()
      }
    } catch (err: any) {
      log(`[Discord-LLM] ⚠️ 調用 DSH 訂閱模型失敗: ${err.message}`)
      if (mode === 'subscriptions') {
        return `[系統提示] 調用 DSH 平台訂閱模型 (${targetProvider}) 失敗：${err.message}。請確認該平台授權是否有效。`
      }
      // auto 模式下失敗則繼續嘗試外部自訂 API 備援
    }
  }

  // 2. 嘗試外部自訂 API
  if (customKey || (config.customLlmApiBase && (config.customLlmApiBase.includes('localhost') || config.customLlmApiBase.includes('127.0.0.1')))) {
    try {
      log(`[Discord-LLM] 嘗試調用自訂 API (${config.customLlmModel || 'deepseek-chat'})...`)
      const res = await callCustomLlmApi(config, systemPrompt, userPrompt, log)
      if (res && res.trim()) return res.trim()
    } catch (err: any) {
      log(`[Discord-LLM] ⚠️ 自訂 API 調用失敗: ${err.message}`)

      // 🌟 關鍵容錯：若為餘額不足 (402 Insufficient Balance)，且 DSH 有授權訂閱模型，立即自動無縫切換！
      if ((err.status === 402 || err.isInsufficientBalance) && authProviders.length > 0) {
        const fallbackProvider = authProviders[0].provider
        const fallbackModel = authProviders[0].defaultModel
        log(`[Discord-LLM] 💡 偵測到自訂 API 餘額不足，立即自動無縫切換至 DSH 訂閱額度 [${fallbackProvider} / ${fallbackModel}]...`)
        try {
          const fbRes = await callLlmViaHost(ctx, fallbackProvider, fallbackModel, systemPrompt, userPrompt, log)
          if (fbRes && fbRes.trim()) {
            log(`[Discord-LLM] ✅ 成功無縫切換至 DSH 訂閱模型回覆`)
            return fbRes.trim()
          }
        } catch (fbErr: any) {
          log(`[Discord-LLM] 降級訂閱模型亦失敗: ${fbErr.message}`)
        }
      }

      if (err.status === 402 || err.isInsufficientBalance) {
        return '[系統提示] DeepSeek API 帳戶餘額不足 (Insufficient Balance)。請至 platform.deepseek.com 儲值，或在 DSH Discord 設定中切換為「DSH 平台訂閱額度 (Subscriptions)」免額度付費。'
      }
      if (err.status === 401) {
        return '[系統提示] API Key 無效或未授權，請在 DSH「Discord 帳號 -> 模型與推理解析配置」檢查 API Key。'
      }
      return `[系統提示] 自訂模型呼叫失敗 (${err.message})，請檢查 API 設定或切換為訂閱模式。`
    }
  }

  // 3. 最後防線：若自訂未配置但有訂閱授權
  if (authProviders.length > 0) {
    const fallbackProvider = authProviders[0].provider
    const fallbackModel = authProviders[0].defaultModel
    log(`[Discord-LLM] 兜底嘗試已授權訂閱模型 [${fallbackProvider} / ${fallbackModel}]...`)
    try {
      const res = await callLlmViaHost(ctx, fallbackProvider, fallbackModel, systemPrompt, userPrompt, log)
      if (res && res.trim()) return res.trim()
    } catch (e: any) {
      log(`[Discord-LLM] 兜底訂閱模型失敗: ${e.message}`)
    }
  }

  log(`[Discord-LLM] ❌ 尚未配置可用之 LLM 模型來源`)
  return '[系統提示] 尚未配置有效的 LLM 模型來源。請在 DSH 控制台的「Discord 帳號 -> 模型與推理解析配置」選擇使用「DSH 平台訂閱額度 (Subscriptions)」或填寫有效的自訂 API Key。'
}
