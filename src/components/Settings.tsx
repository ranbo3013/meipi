import { useState } from 'react'
import {
  AI_PROVIDERS,
  loadAISettings,
  saveAISettings,
  type AISettings,
} from '../aiLayout'
import type { Theme } from '../themes'

interface SettingsProps {
  themes: Theme[]
  themeId: string
  onThemeChange: (id: string) => void
  autosave: boolean
  onAutosaveChange: (on: boolean) => void
}

const CACHE_KEYS = ['meipi:draft', 'meipi:theme', 'meipi:ai', 'meipi:autosave']

export function Settings({
  themes,
  themeId,
  onThemeChange,
  autosave,
  onAutosaveChange,
}: SettingsProps) {
  const [settings, setSettings] = useState<AISettings>(() => loadAISettings())

  const persistSettings = (s: AISettings) => {
    setSettings(s)
    saveAISettings(s)
  }

  const provider =
    AI_PROVIDERS.find((p) => p.id === settings.providerId) ?? AI_PROVIDERS[0]

  const clearCache = () => {
    const ok = window.confirm(
      '确定清空本地数据吗？将删除：写作草稿、主题选择、AI 设置（含 API Key）。此操作不可恢复，建议先备份重要内容。',
    )
    if (!ok) return
    CACHE_KEYS.forEach((k) => localStorage.removeItem(k))
    window.alert('已清空本地数据，页面即将刷新。')
    window.location.reload()
  }

  return (
    <section className="settings-panel">
      {/* AI 接入 */}
      <div className="settings-card">
        <h3 className="settings-card-title">AI 接入</h3>
        <p className="settings-card-desc">
          配置大模型以启用「AI 自动排版」。密钥仅存本地浏览器，直连厂商，不经过任何服务器。
        </p>

        <label className="ai-field">
          <span>模型厂商</span>
          <select
            value={settings.providerId}
            onChange={(e) => {
              const p =
                AI_PROVIDERS.find((x) => x.id === e.target.value) ?? AI_PROVIDERS[0]
              persistSettings({
                ...settings,
                providerId: p.id,
                baseURL: p.baseURL,
                model: p.model,
              })
            }}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="ai-provider-note">{provider.note}</p>

        <label className="ai-field">
          <span>接口地址</span>
          <input
            type="text"
            value={settings.baseURL}
            onChange={(e) =>
              persistSettings({ ...settings, baseURL: e.target.value })
            }
          />
        </label>

        <label className="ai-field">
          <span>模型名</span>
          <input
            type="text"
            value={settings.model}
            onChange={(e) =>
              persistSettings({ ...settings, model: e.target.value })
            }
          />
        </label>

        <label className="ai-field">
          <span>API Key</span>
          <input
            type="password"
            placeholder="sk-... 仅存本地浏览器，不传服务器"
            value={settings.apiKey}
            onChange={(e) =>
              persistSettings({ ...settings, apiKey: e.target.value })
            }
          />
        </label>
        <p className="ai-secure">
          🔒 密钥仅保存在你本地浏览器（localStorage），直连模型厂商，不经过任何第三方服务器。
        </p>
      </div>

      {/* 偏好设置 */}
      <div className="settings-card">
        <h3 className="settings-card-title">偏好设置</h3>

        <label className="ai-field">
          <span>默认主题（下次启动应用）</span>
          <select
            value={themeId}
            onChange={(e) => onThemeChange(e.target.value)}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">草稿自动保存</span>
            <span className="settings-row-sub">关闭后不再本地缓存你的写作内容</span>
          </div>
          <button
            type="button"
            className={'switch' + (autosave ? ' on' : '')}
            onClick={() => onAutosaveChange(!autosave)}
            aria-pressed={autosave}
            aria-label="草稿自动保存开关"
          >
            <span className="switch-dot" />
          </button>
        </div>
      </div>

      {/* 数据与隐私 */}
      <div className="settings-card">
        <h3 className="settings-card-title">数据与隐私</h3>
        <p className="settings-card-desc">
          美文π 是纯前端工具，所有数据（草稿、主题、AI 设置）只存在你自己的浏览器里，我们看不到、也收不到。
        </p>
        <button type="button" className="settings-danger" onClick={clearCache}>
          清空本地数据
        </button>
      </div>
    </section>
  )
}
