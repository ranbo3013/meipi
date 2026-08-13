import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from 'react'
import { sanitizeHtml, stripPastedBackground } from '../render'
import type { Theme } from '../themes'
import { TITLE_PLACEHOLDER } from '../templates'

interface EditorProps {
  initialValue: string
  onChange: (html: string) => void
  theme: Theme
  /** 来自左侧模板面板的待插入 HTML（插入后由 onInsertConsumed 清空） */
  insertHtml?: string | null
  onInsertConsumed: () => void
  /** AI 自动排版结果：整篇替换编辑器内容（替换后由 onReplaceConsumed 清空） */
  replaceHtml?: string | null
  onReplaceConsumed: () => void
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

/** 微信安全字体（粘贴到公众号后台不会丢失） */
const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: '跟随主题', value: '' },
  { label: '苹方', value: '"PingFang SC", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '宋体', value: '"Songti SC", "SimSun", serif' },
  { label: '楷体', value: '"KaiTi", "STKaiti", serif' },
  { label: '黑体', value: '"Heiti SC", sans-serif' },
  { label: '衬线', value: 'serif' },
  { label: '无衬线', value: 'sans-serif' },
  { label: '等宽', value: 'monospace' },
]

/** execCommand('fontSize') 仅支持 1-7，这里映射到近似 px */
const SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: '12', value: '1' },
  { label: '14', value: '2' },
  { label: '16', value: '3' },
  { label: '18', value: '4' },
  { label: '20', value: '5' },
  { label: '24', value: '6' },
  { label: '30', value: '7' },
]

const LINE_HEIGHT_OPTIONS = ['1.5', '1.75', '2.0', '2.5']

/** 对齐图标（左/中/右/两端），内联 SVG、跟随主题色 */
function AlignIcon({ type }: { type: 'left' | 'center' | 'right' | 'justify' }) {
  const lines: Record<string, [number, number, number, number][]> = {
    left: [
      [3, 6, 21, 6],
      [3, 12, 14, 12],
      [3, 18, 18, 18],
    ],
    center: [
      [3, 6, 21, 6],
      [6, 12, 18, 12],
      [5, 18, 19, 18],
    ],
    right: [
      [3, 6, 21, 6],
      [10, 12, 21, 12],
      [6, 18, 21, 18],
    ],
    justify: [
      [3, 6, 21, 6],
      [3, 12, 21, 12],
      [3, 18, 21, 18],
    ],
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      {lines[type].map((p, i) => (
        <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} />
      ))}
    </svg>
  )
}

/** 在编辑器内查找并选中指定占位文字，便于用户直接打字替换 */
function selectPlaceholder(ed: HTMLElement, text: string): void {
  const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const v = node.nodeValue || ''
    const idx = v.indexOf(text)
    if (idx >= 0) {
      const range = document.createRange()
      range.setStart(node, idx)
      range.setEnd(node, idx + text.length)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      return
    }
  }
}

/**
 * 富文本编辑器（contenteditable）+ 排版工具栏。
 * 非受控：仅在挂载时写入初始内容，之后靠 onInput 向上抛出 HTML，
 * 避免受控组件导致的光标跳动。右侧预览与复制共用这份语义 HTML。
 */
export function Editor({
  initialValue,
  onChange,
  theme,
  insertHtml,
  onInsertConsumed,
  replaceHtml,
  onReplaceConsumed,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [sourceMode, setSourceMode] = useState(false)
  const [htmlSource, setHtmlSource] = useState('')
  const [painterOn, setPainterOn] = useState(false)
  const painterStyleRef = useRef<string>('')
  // 当前选中的图片（点击正文图片时记录，供「图片尺寸」使用，不依赖编辑器焦点）
  const selectedImgRef = useRef<HTMLImageElement | null>(null)

  // 撤销/重做历史栈（自管，不依赖已废弃的 execCommand('undo')）
  const historyRef = useRef<string[]>([])
  const histIndexRef = useRef<number>(0)
  const pushTimerRef = useRef<number | null>(null)

  // 仅挂载时初始化一次（先净化，避免历史脏草稿的 class/怪颜色进入编辑器显示层）
  useEffect(() => {
    if (ref.current) {
      const h = sanitizeHtml(initialValue)
      ref.current.innerHTML = h
      historyRef.current = [h]
      histIndexRef.current = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 工具栏按钮在 mousedown 时阻止默认行为：避免编辑器失焦、保留选区，
  // 这样 bold/createLink/插入模板 等才能作用于正确的文字范围（SELECT/INPUT 不受影响）
  useEffect(() => {
    const tb = toolbarRef.current
    if (!tb) return
    const handler = (e: Event) => {
      const t = e.target as HTMLElement
      const btn = t.closest('button')
      if (btn && tb.contains(btn)) e.preventDefault()
    }
    tb.addEventListener('mousedown', handler)
    return () => tb.removeEventListener('mousedown', handler)
  }, [])

  // 追踪编辑器内选区/点击，记录被点中的图片（不依赖焦点，工具栏交互也不丢）
  useEffect(() => {
    const ed = ref.current
    if (!ed) return
    const handler = () => trackSelection()
    ed.addEventListener('click', handler)
    ed.addEventListener('keyup', handler)
    return () => {
      ed.removeEventListener('click', handler)
      ed.removeEventListener('keyup', handler)
    }
  }, [])

  // 将当前编辑器内容上报父组件（用于预览/草稿），并安排一次历史快照（输入防抖，合并连续输入）
  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML)
    schedulePush()
  }

  // 程序化修改（加粗/链接/模板/高亮等）：立即落一条历史快照，保证可被撤销
  const commit = () => {
    if (ref.current) onChange(ref.current.innerHTML)
    pushHistory()
  }

  // 把当前 innerHTML 压入历史栈（去重 + 截断 redo 分支 + 限长）
  const pushHistory = () => {
    const ed = ref.current
    if (!ed) return
    const html = ed.innerHTML
    if (historyRef.current[histIndexRef.current] === html) return
    historyRef.current = historyRef.current.slice(0, histIndexRef.current + 1)
    historyRef.current.push(html)
    if (historyRef.current.length > 200) historyRef.current.shift()
    histIndexRef.current = historyRef.current.length - 1
  }

  // 输入防抖：停顿 400ms 才记一条快照，避免逐字符堆积
  const schedulePush = () => {
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current)
    pushTimerRef.current = window.setTimeout(pushHistory, 400)
  }

  // 光标定位到元素末尾（撤销/重做后恢复焦点，体验可接受）
  const placeCaretAtEnd = (el: HTMLElement) => {
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  const undo = () => {
    if (histIndexRef.current <= 0) return
    histIndexRef.current--
    if (ref.current) {
      ref.current.innerHTML = historyRef.current[histIndexRef.current]
      placeCaretAtEnd(ref.current)
      onChange(ref.current.innerHTML)
    }
  }

  const redo = () => {
    if (histIndexRef.current >= historyRef.current.length - 1) return
    histIndexRef.current++
    if (ref.current) {
      ref.current.innerHTML = historyRef.current[histIndexRef.current]
      placeCaretAtEnd(ref.current)
      onChange(ref.current.innerHTML)
    }
  }

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    ref.current?.focus()
    commit()
  }

  // 去除底色：只清「正文文字」自带的底色（从别处粘贴带来的行色 / 用户主动加的底色），
  // 不动 <div> 容器 —— 一键排版模板的卡片、横幅、角标、二维码框、序号圆等装饰底色
  // 都挂在 div 上，必须保留，否则复制出去模板会花。
  // 主题/语义标签（h1~h3、blockquote、mark、strong、em、a、code、pre、img）的底色同样保留。
  const clearBackground = () => {
    const ed = ref.current
    if (!ed) return
    // 仅这些「正文文字」类标签会承载外来/手动底色，模板与主题底色不在此列
    const TARGET = new Set(['span', 'font', 'p', 'td', 'th', 'li'])
    ed.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (!TARGET.has(el.tagName.toLowerCase())) return
      if (el.style.length) {
        el.style.removeProperty('background-color')
        el.style.removeProperty('background')
        el.style.removeProperty('background-image')
        if (!el.style.cssText.trim()) el.removeAttribute('style')
      }
    })
    ref.current?.focus()
    commit()
  }

  const formatBlock = (tag: string) => exec('formatBlock', tag)

  // 清除链接
  const unlink = () => exec('unlink')

  // 格式刷：第一次点击从选中源文字拾取外观样式，再次点击应用到目标选中文字（单次刷后清空）
  const cancelPainter = () => {
    painterStyleRef.current = ''
    setPainterOn(false)
  }
  const formatPainter = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return cancelPainter()
    const range = sel.getRangeAt(0)
    if (!painterOn) {
      // 拾取：从源选区起点元素读取关键外观样式（只取内联生效的，块级对齐/行高不刷）
      if (range.collapsed) return
      const node = range.startContainer
      const el = (
        node.nodeType === 3 ? node.parentElement : (node as Element)
      ) as HTMLElement | null
      if (!el) return
      const cs = getComputedStyle(el)
      const props = [
        'font-weight', 'font-style', 'text-decoration',
        'color', 'background-color', 'font-size', 'font-family', 'letter-spacing',
      ]
      let style = ''
      for (const p of props) {
        const v = cs.getPropertyValue(p).trim()
        if (!v || v === 'none' || v === 'normal') continue
        if ((p === 'background-color' || p === 'background') && v === 'rgba(0, 0, 0, 0)') continue
        style += `${p}:${v};`
      }
      painterStyleRef.current = style
      setPainterOn(true)
      return
    }
    // 应用：包裹一个 span 写入样式（跨节点时用 extractContents 兜底）
    if (range.collapsed) return cancelPainter()
    const style = painterStyleRef.current
    if (!style) return cancelPainter()
    const span = document.createElement('span')
    span.setAttribute('style', style)
    try {
      range.surroundContents(span)
    } catch {
      const frag = range.extractContents()
      span.appendChild(frag)
      range.insertNode(span)
    }
    ref.current?.focus()
    commit()
    cancelPainter()
  }

  // 插入链接：先保存选区，弹窗输入地址后恢复选区再 createLink；
  // 若未选中文字，则以地址本身作为链接文字插入
  const addLink = () => {
    const sel = window.getSelection()
    const range =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    const url = window.prompt(
      '请输入链接地址（建议以 http:// 或 https:// 开头）：',
      'https://',
    )
    if (!url) return
    const s = window.getSelection()
    if (range && !range.collapsed && s) {
      s.removeAllRanges()
      s.addRange(range)
      ref.current?.focus()
      exec('createLink', url)
      return
    }
    // 未选中文字：以链接地址作为文字插入一个 <a>
    const a = document.createElement('a')
    a.href = url
    a.textContent = url
    if (s && s.rangeCount > 0) {
      const r = s.getRangeAt(0)
      r.deleteContents()
      r.insertNode(a)
      r.setStartAfter(a)
      r.collapse(true)
      s.removeAllRanges()
      s.addRange(r)
    } else if (ref.current) {
      ref.current.appendChild(a)
    }
    ref.current?.focus()
    commit()
  }

  // 高亮：将选中文字包裹进 <mark>
  const toggleHighlight = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    const mark = document.createElement('mark')
    try {
      range.surroundContents(mark)
    } catch {
      mark.appendChild(range.extractContents())
      range.insertNode(mark)
    }
    ref.current?.focus()
    commit()
  }

  // 标注：将选中文字包裹进 <small>（行内小字，用于图片注释/次要说明）
  const toggleAnnotate = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    const small = document.createElement('small')
    try {
      range.surroundContents(small)
    } catch {
      small.appendChild(range.extractContents())
      range.insertNode(small)
    }
    ref.current?.focus()
    commit()
  }

  // 插入图片：纯前端无后端，按图片 URL 插入（公众号后台粘贴后自动转其图床）
  const insertImage = () => {
    const url = window.prompt(
      '请输入图片链接（http:// 或 https:// 开头，或从公众号后台/图床复制到的图片地址）：',
      'https://',
    )
    if (!url) return
    const ed = ref.current
    if (!ed) return
    ed.focus()
    const sel = window.getSelection()
    const range =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    const img = document.createElement('img')
    img.src = url
    img.alt = ''
    img.style.maxWidth = '100%'
    img.style.display = 'block'
    img.style.margin = '16px auto'
    img.style.borderRadius = '8px'
    if (range) {
      range.deleteContents()
      range.insertNode(img)
    } else {
      ed.appendChild(img)
    }
    // 选中刚插入的图片，方便立即调整尺寸
    selectedImgRef.current = img
    commit()
  }

  // 调整当前选中图片的宽度（百分比）。'100%' 表示还原为自适应
  const resizeSelectedImage = (width: string) => {
    const img = selectedImgRef.current
    if (!img) return
    img.style.width = width
    if (width === '100%') {
      // 还原：只保留自适应约束，去掉显式宽度
      img.style.removeProperty('width')
    }
    ref.current?.focus()
    commit()
  }

  // 监听编辑器内的点击/选区变化，记录被点中的图片（供「图片尺寸」使用）
  const trackSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      selectedImgRef.current = null
      return
    }
    const node = sel.getRangeAt(0).startContainer
    const el = node.nodeType === 3 ? node.parentElement : (node as Element)
    selectedImgRef.current =
      (el?.closest('img') as HTMLImageElement | null) ?? null
  }

  // 在光标处插入模板 HTML，并自动选中占位文字（「写入标题」）
  const insertHtmlAtCaret = (html: string) => {
    const ed = ref.current
    if (!ed) return
    ed.focus()
    const sel = window.getSelection()
    const range =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    const frag = document.createDocumentFragment()
    // 剥离 HTML 注释节点（来自 App 端插入的触发 nonce，不应进入正文）
    while (tmp.firstChild) {
      const node = tmp.firstChild
      if (node.nodeType === 8) {
        tmp.removeChild(node)
        continue
      }
      frag.appendChild(node)
    }
    if (range) {
      range.deleteContents()
      range.insertNode(frag)
    } else {
      ed.appendChild(frag)
    }
    selectPlaceholder(ed, TITLE_PLACEHOLDER)
    commit()
  }

  // AI 自动排版：整篇替换编辑器内容（先净化，避免模型偶发带出的脏标签/style）
  const replaceAll = (html: string) => {
    const ed = ref.current
    if (!ed) return
    const clean = sanitizeHtml(html)
    ed.innerHTML = clean
    placeCaretAtEnd(ed)
    onChange(clean)
    pushHistory()
  }

  // 来自左侧模板面板的插入请求：监听 insertHtml 变化后插入并通知父组件清空
  useEffect(() => {
    if (insertHtml) {
      insertHtmlAtCaret(insertHtml)
      onInsertConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertHtml])

  // AI 自动排版结果：整篇替换编辑器内容后通知父组件清空
  useEffect(() => {
    if (replaceHtml) {
      replaceAll(replaceHtml)
      onReplaceConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaceHtml])

  // 字体 / 字号 / 颜色（用 execCommand，纳入浏览器撤销栈、产出公众号兼容标签）
  const setFont = (value: string) => {
    if (!value) return
    exec('fontName', value)
  }
  const setSize = (value: string) => exec('fontSize', value)

  const setColor = (value: string, bg = false) => {
    // 背景色需要 styleWithCSS 才能生成 <span style="background-color">
    document.execCommand('styleWithCSS', false, 'true')
    exec(bg ? 'hiliteColor' : 'foreColor', value)
  }

  // 行高：作用在选中所在的块级元素上（浏览器无原生命令，手动设）
  const setLineHeight = (lh: string) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer
    if (node.nodeType === 3) node = node.parentNode
    const block = (node as Element)?.closest(
      'p,div,blockquote,li,h1,h2,h3,pre'
    ) as HTMLElement | null
    if (block) block.style.lineHeight = lh
    ref.current?.focus()
    commit()
  }

  // HTML 源码模式切换（覆盖层 textarea，编辑器始终挂载，ref 不丢）
  const enterSource = () => {
    if (taRef.current && ref.current) taRef.current.value = ref.current.innerHTML
    setSourceMode(true)
  }
  const exitSource = () => {
    if (taRef.current && ref.current) {
      ref.current.innerHTML = taRef.current.value
      commit()
    }
    setSourceMode(false)
  }

  // 粘贴净化：从源头杜绝外部脏 class / 怪颜色 / !important 进入编辑器
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const cd = e.clipboardData
    const html = cd.getData('text/html')
    const text = cd.getData('text/plain')
    let clean: string
    if (html) {
      clean = stripPastedBackground(sanitizeHtml(html))
    } else if (text) {
      clean = text
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('')
    } else {
      return
    }
    document.execCommand('insertHTML', false, clean)
    ref.current?.focus()
    commit()
  }

  return (
    <div className="editor-pane">
      <div className="editor-toolbar" ref={toolbarRef}>
        {/* 历史 */}
        <button type="button" onClick={undo} title="撤销（回到上一步）" className="tb-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
        <button type="button" onClick={redo} title="重做（恢复撤销）" className="tb-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 14 20 9 15 4" />
            <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => exec('removeFormat')}
          title="清除格式"
        >
          清除
        </button>
        <button
          type="button"
          onClick={clearBackground}
          title="去除文字底色（清除从别处粘贴带来的行色，不影响已高亮的内容）"
        >
          去底色
        </button>
        <button
          type="button"
          className={painterOn ? 'tb-active' : ''}
          onClick={formatPainter}
          title={
            painterOn
              ? '已拾取格式：选中目标文字后再次点击应用，或点击此处取消'
              : '格式刷：先选中一段文字拾取格式，再选中目标文字应用'
          }
        >
          格式刷
        </button>
        <span className="tb-sep" />

        {/* 文本样式 */}
        <button type="button" onClick={() => exec('bold')} title="加粗">
          <b>B</b>
        </button>
        <button type="button" onClick={() => exec('italic')} title="斜体">
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          title="下划线"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => exec('strikeThrough')}
          title="删除线"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => exec('superscript')}
          title="上标"
        >
          x²
        </button>
        <button
          type="button"
          onClick={() => exec('subscript')}
          title="下标"
        >
          x₂
        </button>
        <span className="tb-sep" />

        {/* 标题（基础版式也可在模板面板选更丰富的样式） */}
        <button type="button" onClick={() => formatBlock('<H1>')} title="一级标题">
          H1
        </button>
        <button type="button" onClick={() => formatBlock('<H2>')} title="二级标题">
          H2
        </button>
        <button type="button" onClick={() => formatBlock('<H3>')} title="三级标题">
          H3
        </button>
        <button
          type="button"
          onClick={() => formatBlock('<BLOCKQUOTE>')}
          title="引用"
        >
          引用
        </button>
        <button type="button" onClick={() => formatBlock('<PRE>')} title="代码块">
          {'</>'}
        </button>
        <span className="tb-sep" />

        {/* 列表 / 缩进 */}
        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          title="无序列表"
        >
          • 列表
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          title="有序列表"
        >
          1. 列表
        </button>
        <button
          type="button"
          className="tb-icon"
          onClick={() => exec('indent')}
          title="增加缩进"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 9 8 14 3 19" />
            <line x1="11" y1="9" x2="21" y2="9" />
            <line x1="11" y1="15" x2="21" y2="15" />
          </svg>
        </button>
        <button
          type="button"
          className="tb-icon"
          onClick={() => exec('outdent')}
          title="减少缩进"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 9 3 14 8 19" />
            <line x1="11" y1="9" x2="21" y2="9" />
            <line x1="11" y1="15" x2="21" y2="15" />
          </svg>
        </button>
        <span className="tb-sep" />

        {/* 对齐 */}
        <button
          type="button"
          className="tb-icon"
          onClick={() => exec('justifyLeft')}
          title="左对齐"
        >
          <AlignIcon type="left" />
        </button>
        <button
          type="button"
          className="tb-icon"
          onClick={() => exec('justifyCenter')}
          title="居中对齐"
        >
          <AlignIcon type="center" />
        </button>
        <button
          type="button"
          className="tb-icon"
          onClick={() => exec('justifyRight')}
          title="右对齐"
        >
          <AlignIcon type="right" />
        </button>
        <button
          type="button"
          className="tb-icon"
          onClick={() => exec('justifyFull')}
          title="两端对齐"
        >
          <AlignIcon type="justify" />
        </button>
        <span className="tb-sep" />

        {/* 字号 / 字体 / 颜色 / 行高 */}
        <select
          className="tb-select"
          title="字号"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) setSize(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="">字号</option>
          {SIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}px
            </option>
          ))}
        </select>
        <select
          className="tb-select"
          title="字体"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) setFont(e.target.value)
            e.target.value = ''
          }}
        >
          {FONT_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="tb-color" title="文字颜色">
          字色
          <input
            type="color"
            onChange={(e) => setColor(e.target.value, false)}
          />
        </label>
        <label className="tb-color" title="文字背景色">
          底色
          <input
            type="color"
            onChange={(e) => setColor(e.target.value, true)}
          />
        </label>
        <select
          className="tb-select"
          title="行高"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) setLineHeight(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="">行高</option>
          {LINE_HEIGHT_OPTIONS.map((lh) => (
            <option key={lh} value={lh}>
              {lh}
            </option>
          ))}
        </select>
        <span className="tb-sep" />

        <button
          type="button"
          onClick={toggleAnnotate}
          title="小字标注（图片注释/次要说明）"
        >
          标注
        </button>
        <button type="button" onClick={addLink} title="插入链接">
          🔗 链接
        </button>
        <button type="button" onClick={unlink} title="取消链接">
          去链
        </button>
        <button
          type="button"
          onClick={toggleHighlight}
          title="高亮选中文字"
        >
          🖍 高亮
        </button>
        <button type="button" onClick={insertImage} title="插入图片（按链接地址）">
          🖼 图片
        </button>
        <select
          className="tb-select"
          title="图片尺寸（先点选正文中的图片）"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) resizeSelectedImage(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="">图片尺寸</option>
          <option value="30%">30%</option>
          <option value="50%">50%</option>
          <option value="70%">70%</option>
          <option value="80%">80%</option>
          <option value="100%">100%（自适应）</option>
        </select>
        <span className="tb-sep" />

        {/* 源码 */}
        {sourceMode ? (
          <button type="button" className="tb-active" onClick={exitSource}>
            ✎ 返回编辑
          </button>
        ) : (
          <button type="button" onClick={enterSource} title="查看/编辑 HTML 源码">
            {'</>'} 源码
          </button>
        )}
      </div>

      {/* 富文本编辑区（源码模式隐藏，ref 始终挂载） */}
      <div
        className="rte"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        ref={ref}
        onInput={emit}
        onPaste={onPaste}
        style={{ display: sourceMode ? 'none' : 'block' }}
      />

      {/* HTML 源码编辑层 */}
      {sourceMode && (
        <textarea
          ref={taRef}
          className="rte-source"
          spellCheck={false}
          placeholder="在此直接编辑 HTML 源码，点「返回编辑」生效…"
        />
      )}
    </div>
  )
}
