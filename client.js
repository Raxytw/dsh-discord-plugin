/**
 * client.js —— DSH Web 瀏覽器端設定介面 (Discord 用戶帳號助理專用面板)
 * ============================================================================
 * 設計規範遵循:
 *  - .agents/skills/design-taste-frontend
 *  - references/app-screens.md (Forms & Settings §8, KPIs §5, Quiet Surfaces)
 * 特點:
 *  - 1px 細緻靜音邊框，無廉價表情符號/無磨砂玻璃雜訊
 *  - 嚴謹的雙欄設定網格，高資訊密度，數字與計數啟用 tabular-nums
 *  - 語意狀態指示（在線 Emerald / 警告 Amber / 離線 Rose / 停用 Slate）
 *  - 支援 Token 隱私保護切換、即時連線登入/登出、測試發送、頻道拉取測試
 *  - 完整註冊至 DSH 擴展槽: settings.section, settings.plugins.tab, plugins.item
 * ============================================================================
 */

window.__ModuleLoader__.load({
  id: 'dsh-discord-plugin',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef } = React

    const API = '/api/discord'

    const asJson = async (res) => {
      if (res.ok) return res.json()
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }

    const jget = async (path) => asJson(await fetch(API + path, { credentials: 'same-origin' }))
    const jpost = async (path, body) =>
      asJson(
        await fetch(API + path, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body || {}),
        })
      )

    // 精美專業向量 SVG 圖標集合 (取代 emoji，符合 anti-slop 規範)
    const Icon = {
      Discord: ({ size = 18 }) =>
        h(
          'svg',
          {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'currentColor',
          },
          h('path', {
            d: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
          })
        ),
      MessageSquare: ({ size = 15 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
        ),
      Sparkles: ({ size = 15 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' })
        ),
      Shield: ({ size = 15 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
        ),
      Send: ({ size = 15 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('line', { x1: '22', y1: '2', x2: '11', y2: '13' }),
          h('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
        ),
      Refresh: ({ size = 14, spinning = false }) =>
        h(
          'svg',
          {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            style: spinning ? { animation: 'dc-spin 1s linear infinite' } : {},
          },
          h('polyline', { points: '23 4 23 10 17 10' }),
          h('path', { d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' })
        ),
      Check: ({ size = 14 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('polyline', { points: '20 6 9 17 4 12' })
        ),
      Eye: ({ size = 14 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }),
          h('circle', { cx: '12', cy: '12', r: '3' })
        ),
      EyeOff: ({ size = 14 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M9.88 9.88a3 3 0 1 0 4.24 4.24' }),
          h('path', { d: 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' }),
          h('path', { d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' }),
          h('line', { x1: '2', y1: '2', x2: '22', y2: '22' })
        ),
      Radio: ({ size = 14 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('circle', { cx: '12', cy: '12', r: '2' }),
          h('path', { d: 'M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14' })
        ),
      X: ({ size = 13 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
          h('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
        ),
      Plus: ({ size = 13 }) =>
        h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
          h('line', { x1: '5', y1: '12', x2: '19', y2: '12' })
        ),
    }

    // 專屬 CSS 樣式表 (遵照 app-screens.md 規範: 1px 靜音邊框、tabular-nums、高資訊密度、自適應響應式佈局)
    const CSS = `
@keyframes dc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dc-container,
.dc-container * {
  box-sizing: border-box;
}

.dc-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px 48px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--dsw-alias-label-primary, #f1f5f9);
  line-height: 1.5;
  container-type: inline-size;
  container-name: dc-root;
}

/* 頂部標頭與即時身分識別 (Header & Account Identity, §4.3) */
.dc-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
}
.dc-header-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  flex: 1 1 320px;
}
.dc-avatar-slot {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  position: relative;
  background: rgba(88, 101, 242, 0.15);
  color: #5865F2;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(88, 101, 242, 0.3);
  flex-shrink: 0;
}
.dc-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.dc-avatar-dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid var(--dsw-alias-bg-layer-1, #131217);
}
.dc-avatar-dot.online { background: #10b981; }
.dc-avatar-dot.idle { background: #f59e0b; }
.dc-avatar-dot.dnd { background: #ef4444; }
.dc-avatar-dot.invisible,
.dc-avatar-dot.offline { background: #64748b; }

.dc-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}
.dc-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.dc-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.dc-subtitle {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  margin: 0;
  line-height: 1.5;
}

/* 語意狀態標籤 (Status Pills, §7.6) */
.dc-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.dc-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.dc-pill.connected {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.dc-pill.disconnected {
  background: rgba(244, 63, 94, 0.12);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.25);
}
.dc-pill.connecting {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.dc-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

/* 數據概覽指標卡 (KPI Cards, Quiet Figures, §5) */
.dc-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
@container dc-root (max-width: 580px) {
  .dc-kpi-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .dc-kpi-grid {
    grid-template-columns: 1fr;
  }
}
.dc-kpi-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dc-kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #cbd5e1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dc-kpi-val-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.dc-kpi-val {
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}
.dc-kpi-denom {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  font-variant-numeric: tabular-nums;
}
.dc-kpi-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}
.dc-kpi-bar-fill {
  height: 100%;
  background: #5865F2;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* 分頁切換 (Tabs, §4.4) */
.dc-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  margin-top: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}
.dc-tabs::-webkit-scrollbar {
  display: none;
}
.dc-tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-bottom: -1px;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.dc-tab-btn:hover {
  color: #ffffff;
}
.dc-tab-btn.active {
  color: #ffffff;
  font-weight: 600;
  border-bottom-color: #5865F2;
}

/* 自適應設定區塊 (Adaptive Settings Layout, §8.2) */
.dc-section-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
}
.dc-section-row:last-child {
  border-bottom: none;
}

@container dc-root (min-width: 840px) {
  .dc-section-row {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 24px;
    padding: 24px 0;
  }
}

@media (min-width: 920px) {
  .dc-section-row {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 24px;
    padding: 24px 0;
  }
}

.dc-section-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.dc-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: -0.01em;
}
.dc-section-desc {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  line-height: 1.5;
}
.dc-section-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

/* 響應式欄位網格 (Responsive Field Grids) */
.dc-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.dc-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
@container dc-root (max-width: 580px) {
  .dc-grid-2,
  .dc-grid-3 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .dc-grid-2,
  .dc-grid-3 {
    grid-template-columns: 1fr;
  }
}

/* 表單欄位與控制項 (Form Fields, Inputs & Controls, §8.1) */
.dc-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dc-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dc-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #cbd5e1);
  line-height: 1.4;
}
.dc-field-hint {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  line-height: 1.45;
}
.dc-input {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
  background: rgba(0, 0, 0, 0.25);
  color: #f1f5f9;
  font-family: inherit;
  transition: border-color 0.15s ease;
}
.dc-input:focus {
  outline: none;
  border-color: #5865F2;
}
.dc-input-number {
  font-variant-numeric: tabular-nums;
}
.dc-textarea {
  width: 100%;
  min-width: 0;
  min-height: 72px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
  background: rgba(0, 0, 0, 0.25);
  color: #f1f5f9;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.15s ease;
}
.dc-textarea:focus {
  outline: none;
  border-color: #5865F2;
}

/* 開關列 (Switch Row) */
.dc-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
  border-radius: 6px;
}
.dc-switch-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dc-switch-name {
  font-size: 14px;
  font-weight: 500;
  color: #f1f5f9;
  line-height: 1.4;
}
.dc-switch-sub {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #94a3b8);
  line-height: 1.4;
}
.dc-toggle-btn {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  border: 0;
  padding: 0;
  transition: background 0.2s ease;
  flex-shrink: 0;
}
.dc-toggle-btn.on {
  background: #10b981;
}
.dc-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.2s ease;
}
.dc-toggle-btn.on .dc-toggle-thumb {
  left: 18px;
}

/* 標籤群組 (Tag Pill List for array items) */
.dc-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.dc-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
  font-size: 12px;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  max-width: 100%;
  word-break: break-all;
}
.dc-tag-remove {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dc-tag-remove:hover {
  color: #f43f5e;
}
.dc-tag-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

/* 按鈕 (Buttons) */
.dc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.12));
  background: rgba(255, 255, 255, 0.05);
  color: #f1f5f9;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  user-select: none;
}
.dc-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}
.dc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dc-btn-primary {
  background: #5865F2;
  border-color: #4752c4;
  color: #ffffff;
  font-weight: 600;
}
.dc-btn-primary:hover {
  background: #4752c4;
}
.dc-btn-danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}
.dc-btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 底部儲存動作列 (Sticky Action Bar) */
.dc-action-bar {
  position: sticky;
  bottom: 0;
  margin-top: 20px;
  min-height: 52px;
  background: var(--dsw-alias-bg-layer-1, #131217);
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 18px;
  z-index: 50;
}
.dc-action-status {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dc-action-status.saved { color: #10b981; }
.dc-action-status.dirty { color: #f59e0b; }
.dc-action-status.error { color: #f43f5e; }
.dc-action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
`

    // 主面板 React 組件
    const DiscordPanel = () => {
      const [tab, setTab] = useState('overview')
      const [config, setConfig] = useState(null)
      const [status, setStatus] = useState(null)
      const [dailyStats, setDailyStats] = useState(null)
      const [loading, setLoading] = useState(true)
      const [saving, setSaving] = useState(false)
      const [saveNotice, setSaveNotice] = useState(null)
      const [isDirty, setIsDirty] = useState(false)
      const [showToken, setShowToken] = useState(false)
      const [showApiKey, setShowApiKey] = useState(false)

      // 互動測試發送狀態
      const [testChannelId, setTestChannelId] = useState('')
      const [testType, setTestType] = useState('text')
      const [testContent, setTestContent] = useState('')
      const [testFilePath, setTestFilePath] = useState('')
      const [testStickerId, setTestStickerId] = useState('')
      const [testReplyId, setTestReplyId] = useState('')
      const [testResult, setTestResult] = useState(null)
      const [testingSend, setTestingSend] = useState(false)

      // 即時頻道拉取
      const [guilds, setGuilds] = useState([])
      const [selectedGuild, setSelectedGuild] = useState('')
      const [channels, setChannels] = useState([])
      const [fetchingChannels, setFetchingChannels] = useState(false)

      // 臨時輸入框狀態
      const [newKeyword, setNewKeyword] = useState('')
      const [newMonitoredChannel, setNewMonitoredChannel] = useState('')
      const [newMonitoredGuild, setNewMonitoredGuild] = useState('')
      const [newBlacklistUser, setNewBlacklistUser] = useState('')
      const [newWhitelistUser, setNewWhitelistUser] = useState('')

      const loadData = async () => {
        try {
          const [cfgRes, statRes] = await Promise.all([
            jget('/config'),
            jget('/status'),
          ])
          if (cfgRes?.ok) {
            setConfig(cfgRes.config)
            setIsDirty(false)
          }
          if (statRes?.ok) {
            setStatus(statRes.status)
            setDailyStats(statRes.dailyStats)
          }
        } catch (err) {
          console.error('[Discord Panel] 載入失敗:', err)
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => {
        loadData()
        const timer = setInterval(() => {
          jget('/status')
            .then((res) => {
              if (res?.ok) {
                setStatus(res.status)
                setDailyStats(res.dailyStats)
              }
            })
            .catch(() => {})
        }, 5000)
        return () => clearInterval(timer)
      }, [])

      // 當進入測試分頁且已連線時，自動獲取伺服器清單
      useEffect(() => {
        if (tab === 'test' && status?.state === 'connected' && guilds.length === 0) {
          jget('/guilds')
            .then((res) => {
              if (res?.ok && Array.isArray(res.guilds)) {
                setGuilds(res.guilds)
              }
            })
            .catch(() => {})
        }
      }, [tab, status])

      // 選擇伺服器後拉取頻道
      const handleGuildSelect = async (gId) => {
        setSelectedGuild(gId)
        if (!gId) {
          setChannels([])
          return
        }
        setFetchingChannels(true)
        try {
          const res = await jget(`/channels?guildId=${encodeURIComponent(gId)}`)
          if (res?.ok && Array.isArray(res.channels)) {
            setChannels(res.channels)
          }
        } catch (e) {
          console.error(e)
        } finally {
          setFetchingChannels(false)
        }
      }

      const updateConfig = (key, value) => {
        setConfig((prev) => {
          const next = { ...prev, [key]: value }
          setIsDirty(true)
          return next
        })
      }

      const handleSave = async () => {
        if (!config) return
        setSaving(true)
        setSaveNotice(null)
        try {
          const res = await jpost('/config', config)
          if (res?.ok) {
            setConfig(res.config)
            setIsDirty(false)
            setSaveNotice({ type: 'saved', text: '設定已成功儲存並同步至 Discord 引擎' })
            setTimeout(() => setSaveNotice(null), 3500)
          }
        } catch (e) {
          setSaveNotice({ type: 'error', text: `儲存失敗: ${e.message}` })
        } finally {
          setSaving(false)
        }
      }

      const handleLogin = async () => {
        if (!config?.userToken) {
          alert('請先填入 Discord 使用者 Token')
          return
        }
        setSaving(true)
        try {
          const res = await jpost('/login', {
            token: config.userToken,
            proxyUrl: config.proxyUrl,
          })
          if (res?.ok) {
            setStatus(res.status)
            setSaveNotice({ type: 'saved', text: 'Discord 帳號連線成功！' })
          } else {
            alert(`連線失敗: ${res?.status?.message || res?.error}`)
          }
        } catch (e) {
          alert(`連線例外: ${e.message}`)
        } finally {
          setSaving(false)
        }
      }

      const handleLogout = async () => {
        try {
          const res = await jpost('/logout', {})
          if (res?.ok) {
            setStatus(res.status)
            setSaveNotice({ type: 'saved', text: '已中斷 Discord 帳號連線' })
          }
        } catch (e) {
          alert(`中斷連線失敗: ${e.message}`)
        }
      }

      const handleSendTest = async () => {
        if (!testChannelId) {
          alert('請指定目標頻道 ID 或私訊對象 ID')
          return
        }
        setTestingSend(true)
        setTestResult(null)
        try {
          const payload = {
            channelId: testChannelId,
            type: testType,
            content: testContent,
            imagePath: testFilePath,
            filePath: testFilePath,
            stickerId: testStickerId,
            replyToMessageId: testReplyId || undefined,
          }
          const res = await jpost('/send', payload)
          setTestResult(res)
        } catch (e) {
          setTestResult({ ok: false, error: e.message })
        } finally {
          setTestingSend(false)
        }
      }

      if (loading || !config) {
        return h(
          'div',
          { style: { padding: '48px', textAlign: 'center', color: '#94a3b8' } },
          h(Icon.Refresh, { size: 20, spinning: true }),
          h('div', { style: { marginTop: '12px', fontSize: '13px' } }, '正在載入 Discord 插件設定與即時狀態...')
        )
      }

      const isConnected = status?.ok && status?.state === 'connected'
      const isConnecting = status?.state === 'connecting'
      const statusState = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'

      const user = status?.user || {}
      const username = user.username ? `@${user.username}${user.discriminator && user.discriminator !== '0' ? '#' + user.discriminator : ''}` : '尚未登入'

      // 日報數據計算
      const mentionCount = dailyStats?.mentionReplies || 0
      const mentionCap = config.maxDailyMentionReplies || 60
      const mentionPct = Math.min(100, Math.round((mentionCount / mentionCap) * 100))

      const coChatCount = dailyStats?.coChats || 0
      const coChatCap = config.maxDailyCoChats || 80
      const coChatPct = Math.min(100, Math.round((coChatCount / coChatCap) * 100))

      const dmCount = dailyStats?.dmReplies || 0
      const dmCap = config.maxDailyDmReplies || 60
      const dmPct = Math.min(100, Math.round((dmCount / dmCap) * 100))

      return h(
        'div',
        { className: 'dc-container' },

        // 1. 頂部標頭與即時身分識別 (Header & Account Identity)
        h(
          'div',
          { className: 'dc-header' },
          h(
            'div',
            { className: 'dc-header-left' },
            h(
              'div',
              { className: 'dc-avatar-slot' },
              user.avatarUrl
                ? h('img', { className: 'dc-avatar-img', src: user.avatarUrl, alt: 'avatar' })
                : h(Icon.Discord, { size: 24 }),
              h('span', { className: `dc-avatar-dot ${status?.state === 'connected' ? (config.status || 'online') : 'offline'}` })
            ),
            h(
              'div',
              { className: 'dc-title-group' },
              h(
                'div',
                { className: 'dc-title-row' },
                h('h1', { className: 'dc-title' }, 'Discord 帳號助理 (Selfbot & MCP)'),
                h(
                  'span',
                  { className: `dc-pill ${statusState}` },
                  h('span', { className: 'dc-pill-dot' }),
                  isConnected ? `在線 · ${username}` : isConnecting ? '連線中...' : '未連線'
                )
              ),
              h(
                'p',
                { className: 'dc-subtitle' },
                '自主監聽對話 · 被提及/私訊自然代回 · 群組智慧穿插閒聊 · 支援發送簡訊、圖片、檔案與貼圖'
              )
            )
          ),
          h(
            'div',
            { className: 'dc-header-right' },
            isConnected
              ? h(
                  'button',
                  { className: 'dc-btn dc-btn-danger', onClick: handleLogout },
                  '中斷連線'
                )
              : h(
                  'button',
                  { className: 'dc-btn dc-btn-primary', onClick: handleLogin, disabled: saving || !config.userToken },
                  saving ? h(Icon.Refresh, { spinning: true }) : h(Icon.Radio),
                  saving ? '連線中...' : '立即登入連線'
                ),
            h(
              'button',
              {
                className: 'dc-btn',
                title: '重新整理狀態',
                onClick: () => {
                  jget('/status').then((res) => {
                    if (res?.ok) {
                      setStatus(res.status)
                      setDailyStats(res.dailyStats)
                    }
                  })
                },
              },
              h(Icon.Refresh, { size: 14 })
            )
          )
        ),

        // 2. 數據概覽指標卡 (KPI Cards, §5)
        h(
          'div',
          { className: 'dc-kpi-grid' },
          h(
            'div',
            { className: 'dc-kpi-card' },
            h('span', { className: 'dc-kpi-label' }, '今日被提及代回次數'),
            h(
              'div',
              { className: 'dc-kpi-val-row' },
              h('span', { className: 'dc-kpi-val' }, mentionCount),
              h('span', { className: 'dc-kpi-denom' }, `/ ${mentionCap} 次`)
            ),
            h('div', { className: 'dc-kpi-bar' }, h('div', { className: 'dc-kpi-bar-fill', style: { width: `${mentionPct}%` } }))
          ),
          h(
            'div',
            { className: 'dc-kpi-card' },
            h('span', { className: 'dc-kpi-label' }, '今日主動穿插閒聊發言'),
            h(
              'div',
              { className: 'dc-kpi-val-row' },
              h('span', { className: 'dc-kpi-val' }, coChatCount),
              h('span', { className: 'dc-kpi-denom' }, `/ ${coChatCap} 次`)
            ),
            h('div', { className: 'dc-kpi-bar' }, h('div', { className: 'dc-kpi-bar-fill', style: { width: `${coChatPct}%` } }))
          ),
          h(
            'div',
            { className: 'dc-kpi-card' },
            h('span', { className: 'dc-kpi-label' }, '今日私訊 (DM) 代回次數'),
            h(
              'div',
              { className: 'dc-kpi-val-row' },
              h('span', { className: 'dc-kpi-val' }, dmCount),
              h('span', { className: 'dc-kpi-denom' }, `/ ${dmCap} 次`)
            ),
            h('div', { className: 'dc-kpi-bar' }, h('div', { className: 'dc-kpi-bar-fill', style: { width: `${dmPct}%` } }))
          )
        ),

        // 3. 分頁選單 (Tabs)
        h(
          'div',
          { className: 'dc-tabs' },
          [
            { id: 'overview', label: '帳號與連線', icon: Icon.Discord },
            { id: 'reply', label: '提及與私訊代回', icon: Icon.MessageSquare },
            { id: 'cochat', label: '群組智慧閒聊', icon: Icon.Sparkles },
            { id: 'safety', label: '安全與過濾', icon: Icon.Shield },
            { id: 'test', label: '互動發送測試', icon: Icon.Send },
          ].map((t) =>
            h(
              'button',
              {
                key: t.id,
                className: `dc-tab-btn ${tab === t.id ? 'active' : ''}`,
                onClick: () => setTab(t.id),
              },
              h(t.icon, { size: 14 }),
              t.label
            )
          )
        ),

        // ==========================================
        // 分頁 1: 帳號與連線 (Overview & Connectivity)
        // ==========================================
        tab === 'overview' &&
          h(
            'div',
            null,
            // 啟用插件全域開關
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '插件運作總開關'),
                h('div', { className: 'dc-section-desc' }, '啟用或暫時停止 Discord 插件的所有背景職責與工具調度。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '啟用 Discord 插件'),
                    h('span', { className: 'dc-switch-sub' }, config.enabled ? '所有 MCP 工具與對話監聽正在運作' : '插件已完全停用')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.enabled ? 'on' : ''}`,
                      onClick: () => updateConfig('enabled', !config.enabled),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                )
              )
            ),

            // 使用者憑證與連線
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, 'Discord 使用者 Token'),
                h('div', { className: 'dc-section-desc' }, 'Selfbot 憑證，可於瀏覽器 DevTools 的 Network 請求標頭 Authorization 取得。切勿外流！')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-field' },
                  h(
                    'div',
                    { className: 'dc-field-header' },
                    h('label', { className: 'dc-field-label' }, 'User Token (非 Bot Token)'),
                    h(
                      'button',
                      {
                        style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' },
                        onClick: () => setShowToken(!showToken),
                      },
                      showToken ? h(Icon.EyeOff) : h(Icon.Eye),
                      showToken ? '隱藏' : '顯示'
                    )
                  ),
                  h('input', {
                    className: 'dc-input',
                    type: showToken ? 'text' : 'password',
                    placeholder: '例如: mfa.xxxx 或 OTkxM...',
                    value: config.userToken || '',
                    onChange: (e) => updateConfig('userToken', e.target.value),
                  })
                ),

                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '代理伺服器 URL (Proxy)'),
                  h('input', {
                    className: 'dc-input',
                    type: 'text',
                    placeholder: '選填，例如: http://127.0.0.1:7890 或 socks5://127.0.0.1:1080',
                    value: config.proxyUrl || '',
                    onChange: (e) => updateConfig('proxyUrl', e.target.value),
                  }),
                  h('span', { className: 'dc-field-hint' }, '若本機網路無法直連 Discord Gateway WebSocket，請配置代理。')
                ),

                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '啟動 DSH 時自動登入連線'),
                    h('span', { className: 'dc-switch-sub' }, 'DSH 服務啟動時自動嘗試以已保存的 Token 連線 Gateway')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.autoStart ? 'on' : ''}`,
                      onClick: () => updateConfig('autoStart', !config.autoStart),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                ),

                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '登入後在線狀態 (Presence Status)'),
                  h(
                    'select',
                    {
                      className: 'dc-input',
                      value: config.status || 'online',
                      onChange: (e) => updateConfig('status', e.target.value),
                    },
                    h('option', { value: 'online' }, '在線 (Online)'),
                    h('option', { value: 'idle' }, '閒置 (Idle)'),
                    h('option', { value: 'dnd' }, '請勿打擾 (Do Not Disturb)'),
                    h('option', { value: 'invisible' }, '隱身 (Invisible)')
                  )
                )
              )
            ),

            // 發言擬真防風控
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '擬真與安全行為'),
                h('div', { className: 'dc-section-desc' }, '模擬真實使用者輸入行為，大幅降低被 Discord 系統判定為異常腳本的風險。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '發言前模擬「正在輸入...」狀態'),
                    h('span', { className: 'dc-switch-sub' }, '在傳送文字前先向頻道發送 sendTyping 狀態')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.simulateTyping ? 'on' : ''}`,
                      onClick: () => updateConfig('simulateTyping', !config.simulateTyping),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                ),

                h(
                  'div',
                  { className: 'dc-grid-2' },
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '擬真隨機抖動最小延遲 (秒)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 0,
                      max: 60,
                      value: config.jitterMinSeconds ?? 2,
                      onChange: (e) => updateConfig('jitterMinSeconds', Number(e.target.value)),
                    })
                  ),
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '擬真隨機抖動最大延遲 (秒)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 0,
                      max: 60,
                      value: config.jitterMaxSeconds ?? 5,
                      onChange: (e) => updateConfig('jitterMaxSeconds', Number(e.target.value)),
                    })
                  )
                )
              )
            )
          ),

        // ==========================================
        // 分頁 2: 提及與私訊代回 (Mentions & DM Reply)
        // ==========================================
        tab === 'reply' &&
          h(
            'div',
            null,
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '被 @提及 與 引用回覆'),
                h('div', { className: 'dc-section-desc' }, '當群組或頻道中有成員 @ 提及您，或引用您的發言提問時，由 AI 結合語境智慧應答。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '啟用被 @提及 或 引用回覆應答'),
                    h('span', { className: 'dc-switch-sub' }, '自動調度模型生成恰當回覆並發送')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.mentionReplyEnabled ? 'on' : ''}`,
                      onClick: () => updateConfig('mentionReplyEnabled', !config.mentionReplyEnabled),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                ),

                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '保留 Discord 引用格式 (Reply Quote)'),
                    h('span', { className: 'dc-switch-sub' }, '回覆訊息時以 Discord 原生回覆形式掛載原對話')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.replyQuote ? 'on' : ''}`,
                      onClick: () => updateConfig('replyQuote', !config.replyQuote),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                ),

                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '被提及應答人設 Prompt (System Prompt)'),
                  h('textarea', {
                    className: 'dc-textarea',
                    rows: 3,
                    value: config.mentionPersonaPrompt || '',
                    onChange: (e) => updateConfig('mentionPersonaPrompt', e.target.value),
                  }),
                  h('span', { className: 'dc-field-hint' }, '建議要求精簡扼要（100字內），禁止生硬客服腔。')
                ),

                h(
                  'div',
                  { className: 'dc-grid-2' },
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '單一對象連續回覆輪數上限 (Round Cap)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 1,
                      max: 20,
                      value: config.roundCapPerUser ?? 5,
                      onChange: (e) => updateConfig('roundCapPerUser', Number(e.target.value)),
                    }),
                    h('span', { className: 'dc-field-hint' }, '防止與其他 Bot 或惡意使用者無限套娃互刷。')
                  ),
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '每日被提及回覆總上限 (次)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 1,
                      max: 500,
                      value: config.maxDailyMentionReplies ?? 60,
                      onChange: (e) => updateConfig('maxDailyMentionReplies', Number(e.target.value)),
                    })
                  )
                )
              )
            ),

            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '私訊 (Direct Message) 智慧代回'),
                h('div', { className: 'dc-section-desc' }, '當好友或外部用戶向您的帳號發送私訊時，代表帳號本人進行禮貌且自然的代回。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '啟用私訊自動代回'),
                    h('span', { className: 'dc-switch-sub' }, '收到未讀私訊時由 AI 代為應對')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.dmReplyEnabled ? 'on' : ''}`,
                      onClick: () => updateConfig('dmReplyEnabled', !config.dmReplyEnabled),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                ),

                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '私訊代回應答人設 Prompt'),
                  h('textarea', {
                    className: 'dc-textarea',
                    rows: 3,
                    value: config.dmPersonaPrompt || '',
                    onChange: (e) => updateConfig('dmPersonaPrompt', e.target.value),
                  })
                ),

                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '每日私訊代回總上限 (次)'),
                  h('input', {
                    className: 'dc-input dc-input-number',
                    type: 'number',
                    min: 1,
                    max: 300,
                    value: config.maxDailyDmReplies ?? 60,
                    onChange: (e) => updateConfig('maxDailyDmReplies', Number(e.target.value)),
                  })
                )
              )
            )
          ),

        // ==========================================
        // 分頁 3: 群組智慧閒聊 (Autonomous Co-Chat)
        // ==========================================
        tab === 'cochat' &&
          h(
            'div',
            null,
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '群組自然穿插閒聊 (Co-Chat)'),
                h('div', { className: 'dc-section-desc' }, '無需被 @，在大家熱烈聊到感興趣的話題時，自然穿插進來一起吐槽接梗、表達觀點。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-switch-row' },
                  h(
                    'div',
                    { className: 'dc-switch-text' },
                    h('span', { className: 'dc-switch-name' }, '啟用群組穿插閒聊'),
                    h('span', { className: 'dc-switch-sub' }, '在監聽頻道中依據機率與話題契合度主動發言')
                  ),
                  h(
                    'button',
                    {
                      className: `dc-toggle-btn ${config.coChatEnabled ? 'on' : ''}`,
                      onClick: () => updateConfig('coChatEnabled', !config.coChatEnabled),
                    },
                    h('span', { className: 'dc-toggle-thumb' })
                  )
                ),

                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '穿插聊天人設 Prompt'),
                  h('textarea', {
                    className: 'dc-textarea',
                    rows: 3,
                    value: config.coChatPersonaPrompt || '',
                    onChange: (e) => updateConfig('coChatPersonaPrompt', e.target.value),
                  }),
                  h('span', { className: 'dc-field-hint' }, '提示模型在不適合插嘴時回覆 [NO_REPLY] 自動放棄發言，絕不生硬尬聊。')
                ),

                h(
                  'div',
                  { className: 'dc-grid-3' },
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '閒聊插嘴機率 (%)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 1,
                      max: 100,
                      value: config.coChatProbability ?? 25,
                      onChange: (e) => updateConfig('coChatProbability', Number(e.target.value)),
                    })
                  ),
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '同頻道插嘴冷卻 (秒)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 10,
                      max: 3600,
                      value: config.coChatCooldownSeconds ?? 60,
                      onChange: (e) => updateConfig('coChatCooldownSeconds', Number(e.target.value)),
                    })
                  ),
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '最少累積歷史訊息 (則)'),
                    h('input', {
                      className: 'dc-input dc-input-number',
                      type: 'number',
                      min: 1,
                      max: 20,
                      value: config.coChatMinHistoryMessages ?? 3,
                      onChange: (e) => updateConfig('coChatMinHistoryMessages', Number(e.target.value)),
                    })
                  )
                ),

                // 興趣關鍵字標籤庫
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '觸發興趣關鍵字清單 (命中任一即提高發言意願)'),
                  h(
                    'div',
                    { className: 'dc-tags-wrap' },
                    (config.interestKeywords || []).map((kw, idx) =>
                      h(
                        'span',
                        { key: idx, className: 'dc-tag-item' },
                        `# ${kw}`,
                        h(
                          'button',
                          {
                            className: 'dc-tag-remove',
                            onClick: () => {
                              const list = [...(config.interestKeywords || [])]
                              list.splice(idx, 1)
                              updateConfig('interestKeywords', list)
                            },
                          },
                          h(Icon.X)
                        )
                      )
                    )
                  ),
                  h(
                    'div',
                    { className: 'dc-tag-input-row' },
                    h('input', {
                      className: 'dc-input',
                      style: { flex: 1 },
                      placeholder: '新增關鍵字 (例如: deepseek, 程式, 遊戲, 宵夜)...',
                      value: newKeyword,
                      onChange: (e) => setNewKeyword(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          updateConfig('interestKeywords', [...(config.interestKeywords || []), newKeyword.trim()])
                          setNewKeyword('')
                        }
                      },
                    }),
                    h(
                      'button',
                      {
                        className: 'dc-btn',
                        disabled: !newKeyword.trim(),
                        onClick: () => {
                          if (newKeyword.trim()) {
                            updateConfig('interestKeywords', [...(config.interestKeywords || []), newKeyword.trim()])
                            setNewKeyword('')
                          }
                        },
                      },
                      h(Icon.Plus),
                      '加入'
                    )
                  )
                ),

                // 監聽頻道 ID 清單
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '指定監聽之頻道 ID 清單 (留空代表監聽所有可存取之群組文字頻道)'),
                  h(
                    'div',
                    { className: 'dc-tags-wrap' },
                    (config.monitoredChannelIds || []).map((cid, idx) =>
                      h(
                        'span',
                        { key: idx, className: 'dc-tag-item' },
                        cid,
                        h(
                          'button',
                          {
                            className: 'dc-tag-remove',
                            onClick: () => {
                              const list = [...(config.monitoredChannelIds || [])]
                              list.splice(idx, 1)
                              updateConfig('monitoredChannelIds', list)
                            },
                          },
                          h(Icon.X)
                        )
                      )
                    )
                  ),
                  h(
                    'div',
                    { className: 'dc-tag-input-row' },
                    h('input', {
                      className: 'dc-input',
                      style: { flex: 1 },
                      placeholder: '填入頻道 Snowflake ID (例如: 123456789012345678)...',
                      value: newMonitoredChannel,
                      onChange: (e) => setNewMonitoredChannel(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' && newMonitoredChannel.trim()) {
                          updateConfig('monitoredChannelIds', [...(config.monitoredChannelIds || []), newMonitoredChannel.trim()])
                          setNewMonitoredChannel('')
                        }
                      },
                    }),
                    h(
                      'button',
                      {
                        className: 'dc-btn',
                        disabled: !newMonitoredChannel.trim(),
                        onClick: () => {
                          if (newMonitoredChannel.trim()) {
                            updateConfig('monitoredChannelIds', [...(config.monitoredChannelIds || []), newMonitoredChannel.trim()])
                            setNewMonitoredChannel('')
                          }
                        },
                      },
                      h(Icon.Plus),
                      '加入頻道'
                    )
                  )
                )
              )
            )
          ),

        // ==========================================
        // 分頁 4: 安全與過濾 (Safety & Filtering)
        // ==========================================
        tab === 'safety' &&
          h(
            'div',
            null,
            // 名單過濾
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '黑白名單過濾'),
                h('div', { className: 'dc-section-desc' }, '防止向特定使用者發言，或只允許特定好友觸發自動代回。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                // 黑名單用戶
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '黑名單用戶 ID 清單 (直接忽略其任何發言與提及)'),
                  h(
                    'div',
                    { className: 'dc-tags-wrap' },
                    (config.blacklistUserIds || []).map((uid, idx) =>
                      h(
                        'span',
                        { key: idx, className: 'dc-tag-item' },
                        uid,
                        h(
                          'button',
                          {
                            className: 'dc-tag-remove',
                            onClick: () => {
                              const list = [...(config.blacklistUserIds || [])]
                              list.splice(idx, 1)
                              updateConfig('blacklistUserIds', list)
                            },
                          },
                          h(Icon.X)
                        )
                      )
                    )
                  ),
                  h(
                    'div',
                    { className: 'dc-tag-input-row' },
                    h('input', {
                      className: 'dc-input',
                      style: { flex: 1 },
                      placeholder: '填入用戶 Snowflake ID...',
                      value: newBlacklistUser,
                      onChange: (e) => setNewBlacklistUser(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' && newBlacklistUser.trim()) {
                          updateConfig('blacklistUserIds', [...(config.blacklistUserIds || []), newBlacklistUser.trim()])
                          setNewBlacklistUser('')
                        }
                      },
                    }),
                    h(
                      'button',
                      {
                        className: 'dc-btn',
                        disabled: !newBlacklistUser.trim(),
                        onClick: () => {
                          if (newBlacklistUser.trim()) {
                            updateConfig('blacklistUserIds', [...(config.blacklistUserIds || []), newBlacklistUser.trim()])
                            setNewBlacklistUser('')
                          }
                        },
                      },
                      h(Icon.Plus),
                      '加入黑名單'
                    )
                  )
                ),

                // 白名單用戶
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '白名單用戶 ID 清單 (非空時僅回覆名單內之對象)'),
                  h(
                    'div',
                    { className: 'dc-tags-wrap' },
                    (config.whitelistUserIds || []).map((uid, idx) =>
                      h(
                        'span',
                        { key: idx, className: 'dc-tag-item' },
                        uid,
                        h(
                          'button',
                          {
                            className: 'dc-tag-remove',
                            onClick: () => {
                              const list = [...(config.whitelistUserIds || [])]
                              list.splice(idx, 1)
                              updateConfig('whitelistUserIds', list)
                            },
                          },
                          h(Icon.X)
                        )
                      )
                    )
                  ),
                  h(
                    'div',
                    { className: 'dc-tag-input-row' },
                    h('input', {
                      className: 'dc-input',
                      style: { flex: 1 },
                      placeholder: '填入用戶 Snowflake ID...',
                      value: newWhitelistUser,
                      onChange: (e) => setNewWhitelistUser(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' && newWhitelistUser.trim()) {
                          updateConfig('whitelistUserIds', [...(config.whitelistUserIds || []), newWhitelistUser.trim()])
                          setNewWhitelistUser('')
                        }
                      },
                    }),
                    h(
                      'button',
                      {
                        className: 'dc-btn',
                        disabled: !newWhitelistUser.trim(),
                        onClick: () => {
                          if (newWhitelistUser.trim()) {
                            updateConfig('whitelistUserIds', [...(config.whitelistUserIds || []), newWhitelistUser.trim()])
                            setNewWhitelistUser('')
                          }
                        },
                      },
                      h(Icon.Plus),
                      '加入白名單'
                    )
                  )
                )
              )
            ),

            // 自訂 LLM 端點
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '自訂推理 LLM 端點'),
                h('div', { className: 'dc-section-desc' }, '選填。預設使用 DSH 宿主主模型；填寫後將直接使用自訂 API Key 與 Base URL 生成對話內容。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                h(
                  'div',
                  { className: 'dc-field' },
                  h(
                    'div',
                    { className: 'dc-field-header' },
                    h('label', { className: 'dc-field-label' }, 'API Key (選填)'),
                    h(
                      'button',
                      {
                        style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' },
                        onClick: () => setShowApiKey(!showApiKey),
                      },
                      showApiKey ? h(Icon.EyeOff) : h(Icon.Eye),
                      showApiKey ? '隱藏' : '顯示'
                    )
                  ),
                  h('input', {
                    className: 'dc-input',
                    type: showApiKey ? 'text' : 'password',
                    placeholder: 'sk-xxxx...',
                    value: config.customLlmApiKey || '',
                    onChange: (e) => updateConfig('customLlmApiKey', e.target.value),
                  })
                ),

                h(
                  'div',
                  { className: 'dc-grid-2' },
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, 'API Base URL'),
                    h('input', {
                      className: 'dc-input',
                      type: 'text',
                      placeholder: 'https://api.deepseek.com',
                      value: config.customLlmApiBase || 'https://api.deepseek.com',
                      onChange: (e) => updateConfig('customLlmApiBase', e.target.value),
                    })
                  ),
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '模型名稱 (Model Name)'),
                    h('input', {
                      className: 'dc-input',
                      type: 'text',
                      placeholder: 'deepseek-chat',
                      value: config.customLlmModel || 'deepseek-chat',
                      onChange: (e) => updateConfig('customLlmModel', e.target.value),
                    })
                  )
                )
              )
            )
          ),

        // ==========================================
        // 分頁 5: 互動發送測試 (Live Console & Tester)
        // ==========================================
        tab === 'test' &&
          h(
            'div',
            null,
            h(
              'div',
              { className: 'dc-section-row' },
              h(
                'div',
                { className: 'dc-section-info' },
                h('div', { className: 'dc-section-title' }, '即時發送測試控制台'),
                h('div', { className: 'dc-section-desc' }, '可快速指定目標頻道或私訊用戶，測試發送純文字、本地圖片、文件、貼圖或指定訊息引用回覆。')
              ),
              h(
                'div',
                { className: 'dc-section-panel' },
                // 伺服器與頻道選擇輔助
                guilds.length > 0 &&
                  h(
                    'div',
                    { className: 'dc-grid-2', style: { paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' } },
                    h(
                      'div',
                      { className: 'dc-field' },
                      h('label', { className: 'dc-field-label' }, '快速選擇伺服器 (Guild)'),
                      h(
                        'select',
                        {
                          className: 'dc-input',
                          value: selectedGuild,
                          onChange: (e) => handleGuildSelect(e.target.value),
                        },
                        h('option', { value: '' }, '-- 請選擇伺服器 --'),
                        guilds.map((g) => h('option', { key: g.id, value: g.id }, g.name))
                      )
                    ),
                    h(
                      'div',
                      { className: 'dc-field' },
                      h('label', { className: 'dc-field-label' }, '快速填入頻道 ID'),
                      h(
                        'select',
                        {
                          className: 'dc-input',
                          disabled: fetchingChannels || channels.length === 0,
                          onChange: (e) => {
                            if (e.target.value) setTestChannelId(e.target.value)
                          },
                        },
                        h('option', { value: '' }, fetchingChannels ? '載入頻道中...' : channels.length ? '-- 選擇頻道自動填入 --' : '-- 尚無頻道 --'),
                        channels.map((c) => h('option', { key: c.id, value: c.id }, `# ${c.name} (${c.id})`))
                      )
                    )
                  ),

                // 目標頻道 ID 輸入
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '目標頻道 ID 或 私訊用戶 ID (必填)'),
                  h('input', {
                    className: 'dc-input',
                    placeholder: '填入頻道 Snowflake ID (例如: 123456789012345678)',
                    value: testChannelId,
                    onChange: (e) => setTestChannelId(e.target.value),
                  })
                ),

                // 發送類型
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '發送內容種類'),
                  h(
                    'div',
                    { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
                    [
                      { id: 'text', label: '純文字簡訊' },
                      { id: 'image', label: '圖片檔案 (Image)' },
                      { id: 'file', label: '通用文件 (File)' },
                      { id: 'sticker', label: '官方/伺服器貼圖 (Sticker)' },
                    ].map((typeItem) =>
                      h(
                        'button',
                        {
                          key: typeItem.id,
                          className: `dc-btn ${testType === typeItem.id ? 'dc-btn-primary' : ''}`,
                          onClick: () => setTestType(typeItem.id),
                        },
                        typeItem.label
                      )
                    )
                  )
                ),

                // 文字內容
                (testType === 'text' || testType === 'image' || testType === 'file') &&
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, testType === 'text' ? '訊息內容 (Content)' : '附加說明附文字 (Caption，選填)'),
                    h('textarea', {
                      className: 'dc-textarea',
                      rows: 2,
                      placeholder: '請輸入要傳送的訊息文字...',
                      value: testContent,
                      onChange: (e) => setTestContent(e.target.value),
                    })
                  ),

                // 檔案路徑
                (testType === 'image' || testType === 'file') &&
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '本機檔案絕對路徑 (File Path)'),
                    h('input', {
                      className: 'dc-input',
                      placeholder: '例如: C:\\Users\\user\\Pictures\\demo.png',
                      value: testFilePath,
                      onChange: (e) => setTestFilePath(e.target.value),
                    })
                  ),

                // 貼圖 ID
                testType === 'sticker' &&
                  h(
                    'div',
                    { className: 'dc-field' },
                    h('label', { className: 'dc-field-label' }, '貼圖 Snowflake ID (Sticker ID)'),
                    h('input', {
                      className: 'dc-input',
                      placeholder: '例如: 749054660769218631',
                      value: testStickerId,
                      onChange: (e) => setTestStickerId(e.target.value),
                    })
                  ),

                // 引用回覆訊息 ID
                h(
                  'div',
                  { className: 'dc-field' },
                  h('label', { className: 'dc-field-label' }, '引用回覆訊息 ID (Reply to Message ID，選填)'),
                  h('input', {
                    className: 'dc-input',
                    placeholder: '選填，若填入則以引用該訊息形式發送',
                    value: testReplyId,
                    onChange: (e) => setTestReplyId(e.target.value),
                  })
                ),

                // 發送按鈕
                h(
                  'div',
                  { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '6px' } },
                  h(
                    'button',
                    {
                      className: 'dc-btn dc-btn-primary',
                      disabled: testingSend || !testChannelId || (!testContent && !testFilePath && !testStickerId),
                      onClick: handleSendTest,
                    },
                    testingSend ? h(Icon.Refresh, { spinning: true }) : h(Icon.Send),
                    testingSend ? '正在發送...' : '立即發送測試訊息'
                  )
                ),

                // 測試結果展示
                testResult &&
                  h(
                    'div',
                    {
                      style: {
                        marginTop: '10px',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        background: testResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: testResult.ok ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '12px',
                        color: testResult.ok ? '#34d399' : '#f87171',
                        fontVariantNumeric: 'tabular-nums',
                      },
                    },
                    testResult.ok
                      ? `發送成功！訊息 ID: ${testResult.messageId || '已送出'}`
                      : `發送失敗: ${testResult.error || JSON.stringify(testResult)}`
                  )
              )
            )
          ),

        // 4. 底部動作列 (Fixed Action Bar)
        h(
          'div',
          { className: 'dc-action-bar' },
          h(
            'div',
            { className: `dc-action-status ${saveNotice ? saveNotice.type : isDirty ? 'dirty' : ''}` },
            saveNotice
              ? (saveNotice.type === 'saved' ? h(Icon.Check) : null)
              : isDirty
              ? '※ 有尚未儲存的參數變更'
              : '',
            saveNotice ? saveNotice.text : ''
          ),
          h(
            'div',
            { className: 'dc-action-buttons' },
            h(
              'button',
              {
                className: 'dc-btn',
                onClick: loadData,
                disabled: saving,
              },
              '放棄變更'
            ),
            h(
              'button',
              {
                className: 'dc-btn dc-btn-primary',
                onClick: handleSave,
                disabled: saving,
              },
              saving ? h(Icon.Refresh, { spinning: true }) : h(Icon.Check),
              saving ? '儲存中...' : '儲存變更'
            )
          )
        )
      )
    }

    // 導出標準 DSH Client Plugin 結構
    return {
      name: 'discord-plugin',
      inject: ['slots'],
      apply(ctx) {
        // 注入專屬 CSS 樣式
        try {
          const existing = document.querySelector('style[data-plugin-css="dsh-discord-plugin"]')
          if (existing) {
            existing.textContent = CSS
          } else {
            const style = document.createElement('style')
            style.setAttribute('data-plugin-css', 'dsh-discord-plugin')
            style.textContent = CSS
            document.head.appendChild(style)
            if (typeof ctx.effect === 'function') {
              ctx.effect(() => () => style.remove(), 'dsh-discord-plugin: styles')
            }
          }
        } catch (e) {
          console.error('[dsh-discord-plugin] 注入樣式失敗:', e)
        }

        // 獲取 DSH Slots 服務
        const slots = (typeof ctx.get === 'function' ? ctx.get('slots') : undefined) || ctx.slots
        if (!slots) {
          console.warn('[dsh-discord-plugin] 未找到 slots 服務')
          return
        }

        // 1. 左側一級專屬導航槽位 (settings.section)
        try {
          slots.inject('settings.section', () =>
            slots.register(
              {
                name: 'settings.section',
                id: 'discord-plugin',
                order: 33,
                label: 'Discord',
              },
              () => h(DiscordPanel)
            )
          )
        } catch (e) {
          console.error('[dsh-discord-plugin] 註冊 settings.section 異常:', e)
        }

        // 2. 外掛程式頁面頂部頁籤 (settings.plugins.tab)
        try {
          slots.inject('settings.plugins.tab', () =>
            slots.register(
              {
                name: 'settings.plugins.tab',
                id: 'discord-plugin',
                order: 33,
                label: 'Discord',
              },
              () => h(DiscordPanel)
            )
          )
        } catch (e) {
          console.error('[dsh-discord-plugin] 註冊 settings.plugins.tab 異常:', e)
        }

        // 3. 外掛程式卡片列表槽位 (plugins.item)
        try {
          slots.inject('plugins.item', () =>
            slots.register(
              {
                name: 'plugins.item',
                id: 'discord-plugin',
                order: 33,
                label: 'Discord 帳號助理',
              },
              () => h(DiscordPanel)
            )
          )
        } catch (e) {
          console.error('[dsh-discord-plugin] 註冊 plugins.item 異常:', e)
        }
      },
    }
  },
})
