#!/usr/bin/env node
/**
 * src/mcp-server.ts —— Discord MCP 獨立 Stdio 伺服器 (支援 Claude Desktop / Cursor / Antigravity 等 MCP 客戶端)
 * ============================================================================
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { defaultConfig, sanitizeConfig } from './config.js'
import { DiscordClientWrapper } from './lib/discordClient.js'
import { DiscordLedgerManager } from './lib/ledger.js'
import { createDiscordToolDefinitions } from './tools/discordTools.js'
import { DiscordPluginConfig } from './types.js'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = dirname(__dirname)
const dataDir = join(rootDir, 'data')
if (!existsSync(dataDir)) {
  try {
    mkdirSync(dataDir, { recursive: true })
  } catch {}
}
const configFile = join(dataDir, 'config.json')

let loadedConfig: DiscordPluginConfig = { ...defaultConfig }
if (existsSync(configFile)) {
  try {
    const raw = JSON.parse(readFileSync(configFile, 'utf-8'))
    loadedConfig = sanitizeConfig({ ...defaultConfig, ...raw })
  } catch {}
} else {
  try {
    writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2), 'utf-8')
  } catch {}
}

// 優先覆蓋環境變數
if (process.env.DISCORD_USER_TOKEN) {
  loadedConfig.userToken = process.env.DISCORD_USER_TOKEN
}
if (process.env.DISCORD_PROXY_URL) {
  loadedConfig.proxyUrl = process.env.DISCORD_PROXY_URL
}

const ledger = new DiscordLedgerManager(join(dataDir, 'ledger.json'))
const client = new DiscordClientWrapper((msg) => {
  console.error(`[Discord-MCP-Stdio] ${msg}`)
})

// 自動連線
if (loadedConfig.userToken) {
  client.login(loadedConfig.userToken, loadedConfig.proxyUrl).catch((err) => {
    console.error(`[Discord-MCP] 連線初始異常: ${err.message}`)
  })
}

const toolDefs = createDiscordToolDefinitions(
  () => client,
  () => ledger,
  () => loadedConfig,
  (msg) => console.error(`[Discord-MCP] ${msg}`)
)

const server = new Server(
  {
    name: 'discord-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// 列出工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolDefs.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters,
    })),
  }
})

// 調用工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const target = toolDefs.find((t) => t.name === name)
  if (!target) {
    return {
      content: [{ type: 'text', text: `未知的工具名稱: ${name}` }],
      isError: true,
    }
  }

  try {
    const result = await target.execute(args || {})
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `執行工具異常: ${err.message}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('🚀 Discord MCP Stdio 服務已成功啟動！')
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err)
  process.exit(1)
})
