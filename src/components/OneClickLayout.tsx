import { useMemo, useState, useCallback, useEffect } from 'react'
import type { Theme } from '../themes'
import { buildArticle, wechatifyHtml } from '../render'
import {
  STYLE_ORDER,
  INDUSTRIES,
  USAGES,
  TEMPLATES,
  getUsage,
  genericShell,
  stripShell,
  wrapShell,
  type TemplateDef,
} from '../layoutTemplates'

interface OneClickLayoutProps {
  themes: Theme[]
  /** 当前编辑器内容，用于"套用当前文章"预览 */
  currentContent: string
  /** 套用某个风格的整篇排版（切换主题并跳回写作区） */
  onApplyStyle: (themeId: string) => void
  /** 把模板外壳套到已有文章首尾并写入编辑器（切换主题并跳回写作区） */
  onApplyFull: (themeId: string, html: string) => void
  /** 把示例结构插入编辑器 */
  onInsertScaffold: (html: string) => void
  /** 清空当前编辑器内容 */
  onClearContent: () => void
  /** 跳转到模板库模块（去填写内容） */
  onGoTemplates?: () => void
}

interface Chip {
  id: string
  name: string
}

const ALL: Chip = { id: '', name: '全部' }

/** 把富文本复制到剪贴板（同 CopyButton 的降级方案） */
async function copyRichText(html: string): Promise<boolean> {
  if (!html) return false
  // 主路径：现代 Clipboard API 写 text/html（公众号跨应用粘贴最可靠），附 text/plain 兜底
  try {
    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([html.replace(/<[^>]+>/g, '')], { type: 'text/plain' }),
        }),
      ])
      return true
    }
  } catch {
    // ignore
  }
  // 备路径：execCommand('copy')，容器必须可见（opacity:1）且移出视口，否则易复制成纯文本
  try {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    div.innerHTML = html
    div.style.position = 'fixed'
    div.style.left = '0'
    div.style.top = '-10000px'
    div.style.width = '800px'
    div.style.opacity = '1'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    const range = document.createRange()
    range.selectNodeContents(div)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    } finally {
      sel?.removeAllRanges()
      document.body.removeChild(div)
    }
    return ok
  } catch {
    return false
  }
}

export function OneClickLayout({
  themes,
  currentContent,
  onApplyStyle,
  onApplyFull,
  onInsertScaffold,
  onClearContent,
  onGoTemplates,
}: OneClickLayoutProps) {
  const themeById = useMemo(() => {
    const m: Record<string, Theme> = {}
    themes.forEach((t) => (m[t.id] = t))
    return m
  }, [themes])

  const usageById = useMemo(() => {
    const m: Record<string, (typeof USAGES)[number]> = {}
    USAGES.forEach((u) => (m[u.id] = u))
    return m
  }, [])

  const styleChips: Chip[] = [
    ALL,
    ...STYLE_ORDER.map((id) => ({ id, name: themeById[id]?.name ?? id })),
  ]
  const usageChips: Chip[] = [
    ALL,
    ...USAGES.map((u) => ({ id: u.id, name: u.name })),
  ]
  const industryChips: Chip[] = [ALL, ...INDUSTRIES.map((n) => ({ id: n, name: n }))]

  const [styleFilter, setStyleFilter] = useState('')
  const [usageFilter, setUsageFilter] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0]?.id ?? '')
  const [copied, setCopied] = useState(false)

  const matched = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (!styleFilter || t.styleId === styleFilter) &&
          (!usageFilter || t.usageId === usageFilter) &&
          (!industryFilter || t.industries.includes(industryFilter)),
      ),
    [styleFilter, usageFilter, industryFilter],
  )

  const selected = useMemo(
    () => matched.find((t) => t.id === selectedId) ?? matched[0] ?? TEMPLATES[0],
    [matched, selectedId],
  )

  // 切换筛选后，如果当前选中项不在结果里，默认选第一个
  useEffect(() => {
    const exists = matched.some((t) => t.id === selectedId)
    if (!exists && matched.length > 0) {
      setSelectedId(matched[0].id)
    }
  }, [matched, selectedId])

  // 中间大预览：用当前文章 + 选中模板风格（优先），并把该模板首尾外壳套上；
  // 若当前文章为空则回退到该用途脚手架示例（示例本身已是完整模板，含外壳）
  const previewHtml = useMemo(() => {
    if (!selected) return ''
    const theme = themeById[selected.styleId]
    const usage = usageById[selected.usageId]
    if (!theme || !usage) return ''
    const shellFn = usage.shell ?? genericShell
    let inner: string
    if (currentContent.trim().length > 12) {
      // 预览也先剥离旧外壳，避免「再次套模板」时预览叠加显示
      const body = stripShell(currentContent)
      const { head, foot } = shellFn(usage.name)
      inner = head + body + foot
    } else {
      inner = usage.scaffold(`${usage.name}示例`)
    }
    return buildArticle(inner, theme)
  }, [selected, currentContent, themeById, usageById])

  // 左侧缩略图：用脚手架示例内容，压缩渲染
  const thumbHtml = useCallback(
    (t: TemplateDef) => {
      const theme = themeById[t.styleId]
      const usage = usageById[t.usageId]
      if (!theme || !usage) return ''
      return buildArticle(usage.scaffold(`${usage.name}示例`), theme)
    },
    [themeById, usageById],
  )

  const handleCopy = async () => {
    const ok = await copyRichText(wechatifyHtml(previewHtml))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleApply = () => {
    if (!selected) return
    const usage = usageById[selected.usageId]
    const theme = themeById[selected.styleId]
    if (!usage || !theme) return
    const shellFn = usage.shell ?? genericShell
    let html: string
    if (currentContent.trim().length > 12) {
      // 已有文章：先剥离旧外壳（无论新旧标记/注释/无标记旧草稿都能剥离），
      // 再套上该模板的首尾外壳（正文保留），写入编辑器。
      const body = stripShell(currentContent)
      const { head, foot } = shellFn(usage.name)
      html = wrapShell(head, body, foot)
    } else {
      // 文章为空：直接套用整篇示例（脚手架本身已是完整模板）
      html = usage.scaffold(`${usage.name}示例`)
    }
    onApplyFull(selected.styleId, html)
  }

  const handleInsertExample = () => {
    if (!selected) return
    const usage = usageById[selected.usageId]
    if (!usage) return
    // 插入示例时同步把编辑器主题切到该模板风格，否则复制/预览的标题色会沿用旧主题
    onApplyStyle(selected.styleId)
    onInsertScaffold(usage.scaffold(`${usage.name}示例`))
  }

  const handleFilter = (
    setter: (v: string) => void,
    value: string,
  ) => {
    setter(value)
    // 这里不直接 setSelectedId，由 ensureSelectedVisible 在下一渲染周期修正
  }

  return (
    <section className="ocl">
      {/* 左侧：筛选 + 模板列表 */}
      <aside className="ocl-list">
        <div className="ocl-list-head">
          <div className="ocl-filter-row">
            <span className="ocl-filter-label">风格</span>
            <div className="ocl-chips ocl-chips-compact">
              {styleChips.map((c) => (
                <button
                  key={c.id || 'all-style'}
                  type="button"
                  className={`ocl-chip ${styleFilter === c.id ? 'active' : ''}`}
                  onClick={() => handleFilter(setStyleFilter, c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="ocl-filter-row">
            <span className="ocl-filter-label">用途</span>
            <div className="ocl-chips ocl-chips-compact">
              {usageChips.map((c) => (
                <button
                  key={c.id || 'all-usage'}
                  type="button"
                  className={`ocl-chip ${usageFilter === c.id ? 'active' : ''}`}
                  onClick={() => handleFilter(setUsageFilter, c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="ocl-filter-row">
            <span className="ocl-filter-label">行业</span>
            <div className="ocl-chips ocl-chips-compact">
              {industryChips.map((c) => (
                <button
                  key={c.id || 'all-ind'}
                  type="button"
                  className={`ocl-chip ${industryFilter === c.id ? 'active' : ''}`}
                  onClick={() => handleFilter(setIndustryFilter, c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ocl-count">共 {matched.length} 套模板</div>

        <div className="ocl-items">
          {matched.length === 0 ? (
            <div className="ocl-empty">当前筛选条件下暂无模板，试试放宽筛选。</div>
          ) : (
            matched.map((t) => {
              const styleName = themeById[t.styleId]?.name ?? t.styleId
              const usage = getUsage(t.usageId)
              const active = selected?.id === t.id
              return (
                <button
                  type="button"
                  key={t.id}
                  className={`ocl-item ${active ? 'active' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                  title={`${styleName} · ${usage?.name ?? t.usageId}`}
                >
                  <div
                    className="ocl-item-thumb"
                    dangerouslySetInnerHTML={{ __html: thumbHtml(t) }}
                  />
                  <div className="ocl-item-info">
                    <div className="ocl-item-title">
                      {styleName} · {usage?.name ?? t.usageId}
                    </div>
                    <div className="ocl-item-tags">
                      {t.industries.slice(0, 2).map((ind) => (
                        <span className="ocl-item-tag" key={ind}>
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* 中间：大预览区 */}
      <div className="ocl-preview-wrap">
        <div className="ocl-info">
          <svg
            className="ocl-info-ico"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="ocl-info-text">
            这里是大预览区，<b>不能直接输入内容</b>。请先在「模板库」编辑器写文章或粘贴文本，再回来选模板套用；或点右侧「插入示例结构」把骨架插入编辑器填写。
          </span>
          {onGoTemplates && (
            <button
              type="button"
              className="ocl-info-btn"
              onClick={onGoTemplates}
            >
              前往模板库
            </button>
          )}
        </div>
        <div className="ocl-preview-bar">
          <span className="ocl-preview-title">
            {selected ? (
              <>
                {themeById[selected.styleId]?.name ?? selected.styleId} ·{' '}
                {usageById[selected.usageId]?.name ?? selected.usageId}
              </>
            ) : (
              '请选择模板'
            )}
          </span>
          <span className="ocl-preview-hint">
            {currentContent.trim().length > 12 ? '预览：当前文章套用该模板（含首尾外壳）' : '预览：该模板示例内容'}
          </span>
        </div>
        <div
          className="ocl-preview-stage"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      {/* 右侧：操作按钮 */}
      <aside className="ocl-actions">
        <div className="ocl-actions-title">操作</div>
        <button
          type="button"
          className="ocl-action-primary"
          onClick={handleApply}
          disabled={!selected}
        >
          使用此模板
        </button>
        <button
          type="button"
          className="ocl-action-secondary"
          onClick={handleInsertExample}
          disabled={!selected}
        >
          插入示例结构
        </button>
        <button
          type="button"
          className={`ocl-action-secondary ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          disabled={!previewHtml}
        >
          {copied ? '已复制 HTML' : '复制排版结果'}
        </button>
        <button
          type="button"
          className="ocl-action-danger"
          onClick={() => {
            if (window.confirm('确定清空当前编辑器内容吗？')) onClearContent()
          }}
        >
          清空当前文章
        </button>

        <div className="ocl-actions-divider" />

        <div className="ocl-actions-note">
          说明：
          <br />•「使用此模板」会给当前文章套上该模板的「关注引导条 + END + 二维码」外壳，正文保留，并跳回写作区。
          <br />•「插入示例结构」会把该用途的完整骨架插入编辑器。
          <br />•「复制排版结果」直接复制中间预览的完整 HTML。
        </div>
      </aside>
    </section>
  )
}
