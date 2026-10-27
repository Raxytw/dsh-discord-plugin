/**
 * src/lib/hostdeps.ts —— 優先從宿主環境載入 @deepseek-ai/schemastery
 * ============================================================================
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL } from 'node:url'

export function getCandidateHostRoots(): string[] {
  const out: string[] = []
  const push = (p?: string) => { if (p && !out.includes(p)) out.push(p) }

  push(process.env.DSH_HOST_MODULES)

  const appdata = process.env.APPDATA
  if (appdata) {
    const npm = join(appdata, 'npm', 'node_modules')
    push(join(npm, '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai'))
    push(join(npm, '@deepseek-ai'))
    try {
      for (const n of readdirSync(join(npm, '@deepseek-ai'))) {
        push(join(npm, '@deepseek-ai', n, 'node_modules', '@deepseek-ai'))
      }
    } catch {}
  }

  try {
    const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
    for (const p of readdirSync(join(dshHome, 'profiles'))) {
      push(join(dshHome, 'profiles', p, 'node_modules', '@deepseek-ai'))
    }
  } catch {}

  return out
}

function resolvePackageUrl(root: string, name: string): string | null {
  try {
    const dir = join(root, name)
    const pkgFile = join(dir, 'package.json')
    if (!existsSync(pkgFile)) return null
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    const dot = pkg.exports?.['.']
    const rel = typeof dot === 'string'
      ? dot
      : (dot?.import || dot?.default || pkg.module || pkg.main)
    if (!rel) return null
    const file = join(dir, String(rel).replace(/^\.\//, ''))
    return existsSync(file) ? pathToFileURL(file).href : null
  } catch {
    return null
  }
}

export async function loadSchemastery(): Promise<any> {
  // 1. 優先嘗試宿主環境
  for (const root of getCandidateHostRoots()) {
    const url = resolvePackageUrl(root, 'schemastery')
    if (url) {
      try {
        const mod = await import(url)
        return mod.default || mod
      } catch {}
    }
  }

  // 2. 退回本地依賴
  try {
    const localMod = await import('@deepseek-ai/schemastery')
    return localMod.default || localMod
  } catch {}

  return null
}
