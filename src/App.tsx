import { useEffect, useMemo, useState } from 'react'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { CopyButton } from './components/CopyButton'
import { TemplatePanel } from './components/TemplatePanel'
import { HotTopics } from './components/HotTopics'
import { AIAutoLayout } from './components/AIAutoLayout'
import { OneClickLayout } from './components/OneClickLayout'
import { Settings } from './components/Settings'
import { themes } from './themes'
import { buildArticle } from './render'

const DRAFT_KEY = 'meipi:draft'
const THEME_KEY = 'meipi:theme'

const DEFAULT_HTML = `
<h1>美文π 排版示例</h1>
<p>欢迎使用 <strong>美文π</strong> —— 给美文无限种排版可能。</p>
<h2>这是二级标题</h2>
<p>在左侧直接排版，右侧实时预览公众号效果，满意后点右上角「一键复制」，直接粘贴到公众号后台即可。</p>
<blockquote><p>引用一句话：写作流不被打断，排版交给美文π。</p></blockquote>
<ul><li>列表项一</li><li>列表项二</li><li>列表项三</li></ul>
<ol><li>有序一</li><li>有序二</li></ol>
<pre><code>console.log('hello meipi')</code></pre>
<p>行内代码 <code>npm run dev</code> 与 <mark>高亮文本</mark> 都能优雅呈现。</p>
<hr/>
<p><a href="https://jianpanmiao.com">了解更多排版技巧</a></p>
`

// 顶部「文案示例」插入的示范排版文案
const SAMPLE_TEXT = `
<h2>示例文案 · 看看排版效果</h2>
<p>这是一段示例文字。把光标放在这里，试试下方工具栏的「加粗」「高亮」「引用」「列表」，右侧预览会实时更新。</p>
<blockquote><p>好的排版，是让读者的眼睛先放松，再被内容打动。</p></blockquote>
<ul><li>支持有序 / 无序列表</li><li>支持引用与引用块</li><li>一键套用模板风格</li></ul>
<p>写完点右上角「复制」，直接粘到公众号后台即可。</p>
`

type ModuleId = 'templates' | 'hot' | 'layout' | 'settings'

const MODULE_META: Record<
  ModuleId,
  { title: string; desc: string }
> = {
  templates: { title: '模板库', desc: '选模板、写作排版、实时预览公众号效果' },
  hot: { title: '热点头条', desc: '追实时热榜，找可结合的选题角度' },
  layout: { title: '一键排版', desc: '按风格 / 用途 / 行业筛选模板并套用' },
  settings: { title: '设置', desc: 'AI 接入与个性化偏好，全部存于本地浏览器' },
}

export default function App() {
  const [content, setContent] = useState<string>(
    () => localStorage.getItem(DRAFT_KEY) ?? DEFAULT_HTML,
  )
  const [themeId, setThemeId] = useState<string>(
    () => localStorage.getItem(THEME_KEY) || themes[0].id,
  )
  const [insertHtml, setInsertHtml] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [replaceHtml, setReplaceHtml] = useState<string | null>(null)
  const [module, setModule] = useState<ModuleId>('templates')
  const [navCollapsed, setNavCollapsed] = useState<boolean>(
    () => localStorage.getItem('meipi:navCollapsed') === '1',
  )

  const toggleNav = () => {
    setNavCollapsed((c) => {
      const next = !c
      localStorage.setItem('meipi:navCollapsed', next ? '1' : '0')
      return next
    })
  }

  const theme = useMemo(
    () => themes.find((t) => t.id === themeId) || themes[0],
    [themeId],
  )

  const [autosave, setAutosave] = useState<boolean>(() => {
    const v = localStorage.getItem('meipi:autosave')
    return v !== 'off'
  })

  const handleAutosave = (on: boolean) => {
    setAutosave(on)
    localStorage.setItem('meipi:autosave', on ? 'on' : 'off')
    if (!on) localStorage.removeItem(DRAFT_KEY)
  }

  useEffect(() => {
    if (!autosave) return
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, content)
    }, 400)
    return () => clearTimeout(timer)
  }, [content, autosave])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeId)
  }, [themeId])

  const html = useMemo(() => buildArticle(content, theme), [content, theme])

  const applyAI = (html: string) => setReplaceHtml(html)

  const handleInsert = (html: string) => {
    setInsertHtml(html)
    setModule('templates')
  }

  const applyStyleAndGo = (themeId: string) => {
    setThemeId(themeId)
    setModule('templates')
  }

  // 一键排版「使用此模板」：把套好外壳的整篇 HTML 写入编辑器，并套用风格跳回写作区
  // 走 replaceHtml 通道（Editor 会整篇替换 DOM），避免非受控编辑器不同步
  const applyTemplateFull = (themeId: string, html: string) => {
    setReplaceHtml(html)
    setThemeId(themeId)
    setModule('templates')
  }

  // 顶部「导入文本」：让用户输入/粘贴纯文本，按段落插入编辑器
  const handleImportText = () => {
    const t = window.prompt('粘贴你的文本内容（支持多行，空行分段）：', '')
    if (t == null) return
    const text = t.trim()
    if (!text) return
    const esc = (s: string) =>
      s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
    const html = text
      .split(/\n{1,}/)
      .map((p) => `<p>${esc(p.trim())}</p>`)
      .join('')
    // 末尾注释作为触发 nonce，避免连续点击相同内容时 React effect 不重跑
    setInsertHtml(html + `<!--${Date.now()}-->`)
  }

  // 顶部「文案示例」：在光标处插入一段示范排版文案
  const handleInsertSample = () => {
    setInsertHtml(SAMPLE_TEXT + `<!--${Date.now()}-->`)
  }

  // 清空：走 replaceHtml 通道整篇替换 DOM（setContent 不会回流到非受控编辑器）
  const clearContent = () => setReplaceHtml('<p><br></p>')

  const meta = MODULE_META[module]

  return (
    <div className="app-layout">
      <aside className={`app-sidebar${navCollapsed ? ' collapsed' : ''}`}>
        <div className="app-brand">
          <span className="brand-logo">美</span>
          <div className="brand-text">
            <span className="brand-mark">美文π</span>
            <span className="brand-tag">公众号排版助手</span>
          </div>
        </div>
        <nav className="side-nav">
          <button
            type="button"
            className={module === 'templates' ? 'active' : ''}
            onClick={() => setModule('templates')}
            title="模板库"
          >
            <span className="side-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </span>
            <span className="nav-label">模板库</span>
          </button>
          <button
            type="button"
            className={module === 'layout' ? 'active' : ''}
            onClick={() => setModule('layout')}
            title="一键排版"
          >
            <span className="side-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/></svg>
            </span>
            <span className="nav-label">一键排版</span>
          </button>
          <button
            type="button"
            className={module === 'hot' ? 'active' : ''}
            onClick={() => setModule('hot')}
            title="热点头条"
          >
            <span className="side-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </span>
            <span className="nav-label">热点头条</span>
          </button>
        </nav>
        <div className="side-foot">
          <button
            type="button"
            className="nav-collapse-btn"
            onClick={toggleNav}
            title={navCollapsed ? '展开导航' : '收起导航'}
          >
            <span className="side-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {navCollapsed
                  ? <polyline points="9 18 15 12 9 6" />
                  : <polyline points="15 18 9 12 15 6" />}
              </svg>
            </span>
          </button>
          <button
            type="button"
            className={module === 'settings' ? 'active' : ''}
            onClick={() => setModule('settings')}
            title="设置"
          >
            <span className="side-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </span>
            <span className="nav-label">设置</span>
          </button>
        </div>
      </aside>

      <main className="app-content">
        <header className="app-topbar">
          <div className="topbar-left">
            <span className="topbar-title">{meta.title}</span>
            <span className="topbar-desc">{meta.desc}</span>
          </div>
          <div className="topbar-right">
            {module === 'templates' && (
              <>
                <button className="tb-btn accent" onClick={() => setAiOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
                  AI 自动排版
                </button>
                <ThemeSwitcher themes={themes} value={themeId} onChange={setThemeId} />
                <CopyButton html={html} />
                <a
                  className="tb-btn outline"
                  href="https://mp.weixin.qq.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  公众号后台
                </a>
              </>
            )}
          </div>
        </header>

        <div className="app-main">
          {module === 'hot' ? (
            <HotTopics full />
          ) : module === 'layout' ? (
            <OneClickLayout
              themes={themes}
              currentContent={content}
              onApplyStyle={applyStyleAndGo}
              onApplyFull={applyTemplateFull}
              onInsertScaffold={handleInsert}
              onClearContent={clearContent}
              onGoTemplates={() => setModule('templates')}
            />
          ) : module === 'settings' ? (
            <Settings
              themes={themes}
              themeId={themeId}
              onThemeChange={setThemeId}
              autosave={autosave}
              onAutosaveChange={handleAutosave}
            />
          ) : (
            <div className="mod-templates-wrap">
              <div className="app-toolbar">
                <button className="tool-btn" title="导入文本（粘贴你的内容，自动分段）" onClick={handleImportText}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                  导入文本
                </button>
                <span className="tb-sep" />
                <button className="tool-btn" onClick={() => setAiOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
                  AI 帮写
                </button>
                <button className="tool-btn" onClick={() => setAiOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  AI 改写
                </button>
                <span className="tb-sep" />
                <button className="tool-btn" title="插入一段示例文案" onClick={handleInsertSample}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  文案示例
                </button>
                <button className="tool-btn" onClick={clearContent}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  清空
                </button>
              </div>
              <section className="mod-templates">
                <TemplatePanel theme={theme} onInsert={handleInsert} />
                <Editor
                  initialValue={content}
                  onChange={setContent}
                  theme={theme}
                  insertHtml={insertHtml}
                  onInsertConsumed={() => setInsertHtml(null)}
                  replaceHtml={replaceHtml}
                  onReplaceConsumed={() => setReplaceHtml(null)}
                />
                <Preview html={html} />
              </section>
            </div>
          )}
        </div>
      </main>

      <AIAutoLayout
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        currentText={content}
        onApply={applyAI}
      />
    </div>
  )
}
