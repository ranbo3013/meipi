import { useState, useEffect } from 'react'
import type { Theme } from '../themes'
import { templateCategories } from '../templates'
import { loadSchemes, deleteScheme, type LayoutScheme } from '../schemes'

interface TemplatePanelProps {
  theme: Theme
  onInsert: (html: string) => void
  /** 点击我的方案时：切换主题 + 整篇替换内容 */
  onApplyScheme?: (scheme: LayoutScheme) => void
  /** 方案列表是否已被上层刷新（上层传个 tick 即可） */
  schemesTick?: number
}

/**
 * 左侧「模板库」独立模块（分级管理）：
 *  - 我的方案（用户保存的整篇排版方案，置顶特殊项）
 *  - 大类（基础排版 / 智慧教育）→ 组（标题/分割线…）→ 片段模板
 */
export function TemplatePanel({ theme, onInsert, onApplyScheme, schemesTick = 0 }: TemplatePanelProps) {
  // 当前选中的大类 id；'schemes' 表示我的方案
  const [cat, setCat] = useState('basic')
  // 当前选中的组 id（仅在大类下有效）
  const [tab, setTab] = useState('title')
  const [collapsed, setCollapsed] = useState(false)
  const [schemes, setSchemes] = useState<LayoutScheme[]>([])

  // 读取本地方案
  useEffect(() => {
    setSchemes(loadSchemes())
  }, [schemesTick])

  const schemeGroup = {
    id: 'schemes',
    name: '我的方案',
  }

  // 大类列表：我的方案 置顶，其后跟分类
  const categories = [schemeGroup, ...templateCategories]

  // 当前大类对象（用于取组）
  const currentCat = templateCategories.find((c) => c.id === cat)
  const isSchemeCat = cat === 'schemes'

  function handleDeleteScheme(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    if (!window.confirm(`确定删除方案「${name}」吗？`)) return
    deleteScheme(id)
    setSchemes(loadSchemes())
  }

  function handleApplyScheme(scheme: LayoutScheme) {
    onApplyScheme?.(scheme)
  }

  // 当前要渲染的组（我的方案无组，直接渲染方案列表）
  const activeGroups = isSchemeCat ? [] : (currentCat?.groups ?? [])

  return (
    <aside className={`template-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="tpl-head">
        {!collapsed && <span className="tpl-title">模板库</span>}
        <button
          type="button"
          className="tpl-collapse"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? '展开面板' : '收起面板'}
        >
          {collapsed ? '«' : '»'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 一级：大类 tab */}
          <div className="tpl-cats">
            {categories.map((c) => {
              const active = cat === c.id
              const count =
                c.id === 'schemes'
                  ? schemes.length
                  : ((c as any).groups || []).reduce((n: number, g: any) => n + (g.items?.length ?? 0), 0)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${active ? 'active' : ''} ${c.id === 'schemes' ? 'tab-schemes' : ''}`}
                  onClick={() => {
                    setCat(c.id)
                    // 切换大类时默认选中第一个组
                    if (c.id !== 'schemes') {
                      const first = (c as any).groups?.[0]
                      if (first) setTab(first.id)
                    }
                  }}
                  title={`${c.name}（${count}）`}
                >
                  {c.name}
                  {c.id === 'schemes' && (
                    <span className="tpl-tab-count">{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 二级：组 tab（仅大类下显示） */}
          {!isSchemeCat && activeGroups.length > 0 && (
            <div className="tpl-subtabs">
              {activeGroups.map((g) => {
                const active = tab === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={active ? 'active' : ''}
                    onClick={() => setTab(g.id)}
                    title={`${g.name}（${g.items.length}）`}
                  >
                    {g.name}
                  </button>
                )
              })}
            </div>
          )}

          <div className="tpl-list">
            {isSchemeCat ? (
              schemes.length === 0 ? (
                <div className="tpl-empty">
                  <div className="tpl-empty-icon">📋</div>
                  <div className="tpl-empty-text">还没有排版方案</div>
                  <div className="tpl-empty-hint">排完文章后，点顶栏「存为方案」一键保存</div>
                </div>
              ) : (
                schemes.map((s) => (
                  <div key={s.id} className="scheme-item-wrap">
                    <button
                      type="button"
                      className="tpl-item scheme-item"
                      onClick={() => handleApplyScheme(s)}
                      title={`应用方案：${s.name}`}
                    >
                      <div
                        className="tpl-thumb scheme-thumb"
                        dangerouslySetInnerHTML={{ __html: s.html }}
                      />
                      <div className="tpl-name">{s.name}</div>
                    </button>
                    <button
                      type="button"
                      className="scheme-del-btn"
                      onClick={(e) => handleDeleteScheme(e, s.id, s.name)}
                      title="删除此方案"
                    >
                      ×
                    </button>
                  </div>
                ))
              )
            ) : (
              (((activeGroups.find((g) => g.id === tab) ?? activeGroups[0])?.items) || []).map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  className="tpl-item"
                  onClick={() => onInsert(item.render(theme))}
                  title={`插入：${item.name}`}
                >
                  <div
                    className="tpl-thumb"
                    dangerouslySetInnerHTML={{ __html: item.render(theme) }}
                  />
                  <div className="tpl-name">{item.name}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  )
}
