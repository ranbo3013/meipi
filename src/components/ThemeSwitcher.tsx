import { useEffect, useRef, useState } from 'react'
import type { Theme, ThemeCategory } from '../themes'

interface ThemeSwitcherProps {
  themes: Theme[]
  value: string
  onChange: (id: string) => void
}

/** 默认展示的最新主题数量（主题追加在数组末尾，取最后 N 个） */
const DEFAULT_VISIBLE = 6

/** 大类展示顺序与中文名 */
const CATEGORY_ORDER: { key: ThemeCategory; label: string }[] = [
  { key: 'festival', label: '节日' },
  { key: 'season', label: '节气' },
  { key: 'industry', label: '行业' },
  { key: 'general', label: '通用' },
]

export function ThemeSwitcher({ themes, value, onChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 主题总数少，直接全展示，不做展开
  if (themes.length <= DEFAULT_VISIBLE) {
    return (
      <div className="theme-switcher">
        {themes.map((t) => (
          <button
            key={t.id}
            className={'theme-btn' + (t.id === value ? ' active' : '')}
            title={t.description}
            onClick={() => onChange(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
    )
  }

  // 默认行展示最新的 6 个
  const defaultThemes = themes.slice(-DEFAULT_VISIBLE)

  // 按大类分组（供下拉使用）
  const grouped = CATEGORY_ORDER.map((c) => ({
    ...c,
    items: themes.filter((t) => t.category === c.key),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="theme-switcher theme-switcher--dropdown" ref={wrapRef}>
      {defaultThemes.map((t) => (
        <button
          key={t.id}
          className={'theme-btn' + (t.id === value ? ' active' : '')}
          title={t.description}
          onClick={() => onChange(t.id)}
        >
          {t.name}
        </button>
      ))}
      <button
        type="button"
        className={'theme-btn theme-expand' + (open ? ' active' : '')}
        title={open ? '收起全部主题' : `展开全部 ${themes.length} 个主题`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <polyline points="18 15 12 9 6 15" />
          ) : (
            <polyline points="6 9 12 15 18 9" />
          )}
        </svg>
        全部
      </button>

      {open && (
        <>
          {/* 点击外部关闭 */}
          <div
            className="theme-dropdown-backdrop"
            onClick={() => setOpen(false)}
          />
          <div
            className="theme-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="theme-dropdown-head">
              <span>全部主题（{themes.length}）</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="theme-dropdown-reset"
                  onClick={() => {
                    onChange(themes[0].id)
                    setOpen(false)
                  }}
                  title="恢复默认主题"
                >
                  ↺ 重置默认
                </button>
                <button
                  type="button"
                  className="theme-dropdown-close"
                  onClick={() => setOpen(false)}
                  title="收起"
                >
                  收起
                </button>
              </div>
            </div>
            <div className="theme-dropdown-grid">
              {grouped.map((g) => (
                <div key={g.key} className="theme-dropdown-cat">
                  <div className="theme-dropdown-cat-label">{g.label}</div>
                  <div className="theme-dropdown-cat-items">
                    {g.items.map((t) => (
                      <button
                        key={t.id}
                        className={
                          'theme-btn theme-dropdown-item' +
                          (t.id === value ? ' active' : '')
                        }
                        title={t.description}
                        onClick={() => onChange(t.id)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
