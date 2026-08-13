import { useState } from 'react'
import type { Theme } from '../themes'
import { templateGroups } from '../templates'

interface TemplatePanelProps {
  theme: Theme
  /** 点击模板项时，把该模板基于当前主题生成的 HTML 抛给上层插入到编辑器光标处 */
  onInsert: (html: string) => void
}

/**
 * 左侧「模板库」独立模块：标题/分割线/正文/引导栏/布局 5 类，点击插入。
 * 与「热点话题」是并列的两个独立面板，互不嵌套。
 * 可折叠：收起后只留一条，不占用编辑/预览空间。
 */
export function TemplatePanel({ theme, onInsert }: TemplatePanelProps) {
  const [tab, setTab] = useState('title')
  const [collapsed, setCollapsed] = useState(false)

  const group = templateGroups.find((g) => g.id === tab) ?? templateGroups[0]

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
          <div className="tpl-tabs">
            {templateGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={tab === g.id ? 'active' : ''}
                onClick={() => setTab(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="tpl-list">
            {group.items.map((item) => (
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
            ))}
          </div>
        </>
      )}
    </aside>
  )
}
