import MarkdownIt from 'markdown-it'
import type { Theme, StyleMap } from './themes'

// Markdown 解析器配置
const md: any = new MarkdownIt({
  html: false, // 不允许原始 HTML，安全
  linkify: true, // 裸链接自动转 a
  typographer: true, // 智能引号/省略号
  breaks: false, // 单个换行不强制 <br>，符合标准 Markdown
})

// 支持 ==高亮文本== 语法
md.inline.ruler.before('emphasis', 'mark', (state: any, silent: boolean) => {
  const src: string = state.src
  const pos: number = state.pos
  // 必须以两个等号开头
  if (src.charCodeAt(pos) !== 0x3d || src.charCodeAt(pos + 1) !== 0x3d) return false
  const end = src.indexOf('==', pos + 2)
  if (end === -1) return false
  const content = src.slice(pos + 2, end)
  if (!content.trim()) return false
  if (!silent) {
    const token = state.push('mark', 'mark', 0)
    token.content = content
  }
  state.pos = end + 2
  return true
})
md.renderer.rules.mark = (tokens: any, idx: number) =>
  '<mark>' + tokens[idx].content + '</mark>'

/** 将 Markdown 解析为干净的语义 HTML 字符串 */
export function renderMarkdown(markdown: string): string {
  return md.render(markdown)
}

/**
 * 把样式对象写入元素的内联 style。
 * 关键：非破坏性——只补齐用户「没有显式设置」的属性，
 * 已存在的（用户在富文本里手动设的行高/对齐/字号/颜色等）一律保留。
 * 这样主题定基调、用户局部微调优先，且复制到公众号零错乱。
 */
function applyStyles(el: Element, style: StyleMap) {
  const node = el as HTMLElement
  for (const [prop, val] of Object.entries(style)) {
    if (!node.style.getPropertyValue(prop)) {
      node.style.setProperty(prop, val)
    }
  }
}

/**
 * 将解析后的语义 HTML 应用主题，输出「内联样式」HTML。
 * 这一步是核心：公众号会剥离 class 与外链 CSS，只有内联样式能保留，
 * 因此预览所见即复制所得，粘贴到公众号后台零错乱。
 */
export function applyTheme(html: string, theme: Theme): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body

  // 用 <section> 包裹全部内容作为文章容器
  const section = doc.createElement('section')
  while (body.firstChild) section.appendChild(body.firstChild)
  applyStyles(section, theme.container)

  const tagMap: Record<string, StyleMap> = {
    h1: theme.h1,
    h2: theme.h2,
    h3: theme.h3,
    p: theme.p,
    strong: theme.strong,
    b: theme.strong,
    em: theme.em,
    i: theme.em,
    a: theme.a,
    blockquote: theme.blockquote,
    pre: theme.pre,
    ul: theme.ul,
    ol: theme.ol,
    li: theme.li,
    hr: theme.hr,
    img: theme.img,
    mark: theme.mark,
    small: theme.small,
  }

  section.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'code') {
      // 代码块内部的 code 使用 preCode 样式，避免与行内 code 冲突
      if (el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') {
        applyStyles(el, theme.preCode)
      } else {
        applyStyles(el, theme.code)
      }
      return
    }
    const style = tagMap[tag]
    if (style) applyStyles(el, style)
  })

  return section.outerHTML
}

/**
 * 组合：将富文本/语义 HTML 应用主题，产出内联样式 HTML（预览与复制共用）。
 * 若将来需要「导入 .md」，可先 renderMarkdown(md) 得到语义 HTML 再传入此处。
 */
export function buildArticle(contentHtml: string, theme: Theme): string {
  return applyTheme(sanitizeHtml(contentHtml), theme)
}

// ----------------- HTML 净化（复制纯净、公众号兼容） -----------------

// 公众号后台不支持的现代颜色空间：lab / oklab / oklch / lch / color() / hwb
const COLOR_FN_RE = /(ok?l?ab|oklch|lch|color|hwb)\s*\([^)]*\)/gi

/** 把现代颜色函数转成 rgb（浏览器原生即可解析），公众号只认 rgb/hex/hsl */
function normalizeColorValue(value: string): string {
  if (!COLOR_FN_RE.test(value)) return value
  COLOR_FN_RE.lastIndex = 0
  return value.replace(COLOR_FN_RE, (match) => {
    const tmp = document.createElement('span')
    tmp.style.color = match
    document.body.appendChild(tmp)
    const rgb = getComputedStyle(tmp).color
    document.body.removeChild(tmp)
    return rgb && rgb !== 'rgba(0, 0, 0, 0)' ? rgb : match
  })
}

// 只允许保留的样式属性（其余外部 reset 一律丢弃，避免污染公众号）
// 注意：模板库需要 border/margin/padding/background 等装饰属性，
// 因此此处放开。规则仍严格——只允许排版装饰类属性，仍会丢弃 class、
// lab/oklab 颜色、!important 与非法标签，保证复制出去干净且公众号兼容。
const STYLE_WHITELIST = new Set([
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-transform',
  'color',
  'background-color',
  'background',
  'text-align',
  'line-height',
  'letter-spacing',
  'border',
  'border-top',
  'border-bottom',
  'border-left',
  'border-right',
  'border-radius',
  'border-collapse',
  'vertical-align',
  'list-style',
  'list-style-type',
  'list-style-position',
  'margin',
  'padding',
  'display',
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'align-items',
  'align-self',
  'justify-content',
  'gap',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
  'box-sizing',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'box-shadow',
  'float',
  'clear',
  'width',
  'height',
  'object-fit',
  'object-position',
])

// 只允许保留的标签
const TAG_WHITELIST = new Set([
  'h1', 'h2', 'h3', 'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'blockquote', 'ul', 'ol', 'li', 'pre', 'code',
  'span', 'mark', 'img', 'font', 'div', 'small',
  'table', 'tbody', 'tr', 'td', 'th',
])

/**
 * 净化外来 HTML（尤其是从别的编辑器/网页粘贴进来的内容）：
 *  - 删除 class / id / contenteditable / data-*（我们从不依赖，公众号也会剥离 class）
 *  - 仅保留白名单样式属性，丢弃外部 margin/padding/border 等 reset
 *  - 把 lab/oklab/... 等公众号不支持的颜色规范化为 rgb
 *  - 去除 !important
 *  - 不允许的标签降级为其文本内容
 *  - 不含块级子元素的 div 降级为 p，让段落吃到主题样式
 * 这样「复制出去的内容」100% 干净、可被公众号正确渲染。
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 1) 移除不允许的标签（保留其文本/子节点）—— 限定在 body 范围内，parent 永不会是 document/html，彻底避免非法 insertBefore
  doc.body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    // 跳过文档骨架节点（html/head/body），DOMParser 补全的，绝不能对其做降级插入
    if (tag === 'html' || tag === 'head' || tag === 'body') return
    if (!TAG_WHITELIST.has(tag)) {
      const parent = el.parentNode
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
      }
    }
  })

  // 2) 清洗允许标签的属性与 style
  doc.body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'html' || tag === 'head' || tag === 'body') return
    el.removeAttribute('class')
    el.removeAttribute('id')
    el.removeAttribute('contenteditable')
    Array.from(el.attributes).forEach((a) => {
      // 放行 data-meipi-shell：套模板时用于标记外壳（head/body/foot），
      // 让「再次套模板」能精准剥离旧外壳；其余 data-* 仍一律剥离。
      if (a.name.startsWith('data-') && a.name !== 'data-meipi-shell') {
        el.removeAttribute(a.name)
      }
    })

    const node = el as HTMLElement
    if (node.style && node.style.length) {
      const decls: string[] = []
      STYLE_WHITELIST.forEach((prop) => {
        const val = node.style.getPropertyValue(prop)
        if (!val) return
        let v = val.replace(/\s*!important/gi, '')
        if (/(color|background)/i.test(prop)) v = normalizeColorValue(v)
        decls.push(`${prop}:${v}`)
      })
      if (decls.length) node.setAttribute('style', decls.join(';'))
      else node.removeAttribute('style')
    }

    // 链接只保留 href
    if (el.tagName.toLowerCase() === 'a') {
      const href = el.getAttribute('href')
      Array.from(el.attributes).forEach((a) => {
        if (a.name !== 'href') el.removeAttribute(a.name)
      })
      if (href) el.setAttribute('href', href)
    }
  })

  // 3) 不含块级子元素的 div 降级为 p；但帶有顯式 style 的 div 視為排版裝飾容器，予以保留
  doc.body.querySelectorAll('div').forEach((div) => {
    if (div.hasAttribute('style')) return
    const hasBlockChild = Array.from(div.children).some((c) =>
      /^(P|DIV|BLOCKQUOTE|UL|OL|H1|H2|H3|PRE|LI|TABLE|TR|TD|TH)$/i.test(
        c.tagName,
      ),
    )
    if (hasBlockChild) return
    const p = doc.createElement('p')
    while (div.firstChild) p.appendChild(div.firstChild)
    div.replaceWith(p)
  })

  return doc.body.innerHTML
}

/**
 * 粘贴专用清洗：默认粘贴「只保留结构、不保留外来样式」。
 * 从 Word / 网页 / 其他编辑器粘进来的内容往往裹着各自的字号、字色、
 * 加粗、底色、行距等内联样式，若原样带入会破坏公众号统一排版。
 * 这里剥掉全部内联 style（让主题统一接管），仅保留：
 *  - 语义标签结构（h1~h3 / p / 列表 / 引用 / 链接 / 图片 / 加粗 / 斜体 等）
 *  - 链接的 href
 *  - 图片的基础可见性约束（max-width:100% 防止撑爆）
 * 用户在编辑器内主动用工具栏加的格式不经过此通道，不受影响。
 */
export function stripPastedBackground(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    const node = el as HTMLElement
    if (tag === 'img') {
      // 图片只保留基础可见性约束，其余外来 style 一律丢弃
      node.style.cssText = 'max-width:100%;height:auto;'
      return
    }
    // 其余元素：彻底清掉外来内联样式（字号/字色/底色/行距/对齐…）
    if (node.style && node.style.cssText.trim()) node.removeAttribute('style')
    // 外部粘贴的 <mark> 几乎都是别人页面自带的高亮底，降级为 span 去底色
    if (tag === 'mark') {
      const span = doc.createElement('span')
      while (el.firstChild) span.appendChild(el.firstChild)
      el.replaceWith(span)
    }
  })
  return doc.body.innerHTML
}

/**
 * 「公众号兼容化」转换：在复制到公众号之前，把浏览器/模板里常用、
 * 但公众号后台不支持或支持很差的内联样式降级成兼容写法，避免粘贴后变形。
 *  - flex 布局 → 去掉 flex 相关属性（容器变普通块级、保留底色/边框/圆角），
 *    直接子元素改用 inline-block + vertical-align:middle 尽量保留横排；
 *    （公众号对 display:flex / display:table 支持都很差，inline-block 最稳）
 *  - position:absolute 装饰元素（模板里的小圆点等）→ 直接删除（纯装饰，absolute 在公众号会乱跑）
 *  - transform:rotate 等 → 移除（公众号不支持，方块保留只是不旋转）
 * 注意：仅作用于「复制去公众号」的产物；预览仍保留原样（浏览器支持 flex，更好看）。
 * 仅处理 div（模板装饰容器），不动主题/语义标签与正文。
 */
export function wechatifyHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 1) 删除 absolute / relative 定位的纯装饰元素（position 在公众号会被整行删除）
  doc.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const p = el.style.position
    if (p === 'absolute' || p === 'relative' || p === 'fixed') {
      // absolute 元素通常是纯装饰，直接删除；relative 仅用于布局微调，去掉属性即可
      if (p === 'absolute') el.remove()
      else el.style.removeProperty('position')
    }
  })

  // 2) flex 容器降级为「块级容器 + 子元素 inline-block 横排」
  //    公众号对 display:flex / display:table 支持都很差，inline-block 横排最稳。
  //    关键修正：原版只把「显式声明过 display 的子元素」转 inline-block，
  //    但模板里大量横排子 div 根本没写 display（默认 block），flex 一去掉就竖着堆起来，
  //    导致 END 装饰条、关注条等整排错乱。这里改为「所有直接子元素」一律 inline-block。
  //    处理顺序：从最内层嵌套 flex 往外处理（reverse），确保外层给内层容器补上
  //    inline-block 时不会被内层自身的 flex 清理覆盖。
  const flexDivs = Array.from(
    doc.body.querySelectorAll<HTMLElement>('div'),
  ).filter((div) => {
    const d = div.style.display
    return d === 'flex' || d === 'inline-flex'
  })
  flexDivs.reverse().forEach((div) => {
    const cs = div.style
    const justify = cs.justifyContent
    const centerH =
      justify === 'center' ||
      justify === 'space-between' ||
      justify === 'space-around' ||
      justify === 'space-evenly'
    // 直接子元素：全部转 inline-block 横排（图片也统一 inline-block + 垂直居中）
    Array.from(div.children).forEach((child) => {
      const c = child as HTMLElement
      c.style.setProperty('display', 'inline-block')
      c.style.setProperty('vertical-align', 'middle')
      c.style.removeProperty('flex')
      c.style.removeProperty('flex-grow')
      c.style.removeProperty('flex-shrink')
      c.style.removeProperty('flex-basis')
      c.style.removeProperty('gap')
    })
    // 容器：去掉 flex 相关属性，变回普通块级（保留 background/border/padding 等装饰）
    cs.removeProperty('display')
    cs.removeProperty('align-items')
    cs.removeProperty('justify-content')
    cs.removeProperty('flex-direction')
    cs.removeProperty('flex-wrap')
    cs.removeProperty('flex')
    cs.removeProperty('gap')
    // 用 text-align:center 近似 justify-content 的居中/两端对齐，保证横排居中不散开
    if (centerH && !cs.textAlign) cs.setProperty('text-align', 'center')
  })

  // 3) 移除 transform（rotate 等公众号不支持）
  doc.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.style && el.style.transform) el.style.removeProperty('transform')
  })

  // 4) 把「带背景/边框/圆角的装饰 div」转成公众号更认的标签：
  //    - 行内/小卡片（display:inline-block/inline-flex 或宽度较小）→ <span>
  //    - 块级大卡片（全宽、有 margin 等）→ <table width="100%"><tr><td>
  //    微信编辑器在某些环境/版本里对 <div> 的 background/border 过滤更激进，
  //    但对 <table>/<td> 和 <span> 的同等内联样式保留更稳定。
  const KEEP_ON_TD = new Set([
    'background-color',
    'background',
    'border',
    'border-top',
    'border-bottom',
    'border-left',
    'border-right',
    'border-radius',
    'padding',
    'color',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'vertical-align',
  ])
  const KEEP_ON_TABLE = new Set(['margin', 'width', 'max-width', 'min-width'])

  function looksLikeDecoration(div: HTMLElement): boolean {
    const s = div.style
    return !!(
      s.backgroundColor ||
      s.background ||
      s.border ||
      s.borderTop ||
      s.borderBottom ||
      s.borderLeft ||
      s.borderRight ||
      s.borderRadius
    )
  }

  function isInlineLike(div: HTMLElement): boolean {
    const d = div.style.display
    if (d === 'inline' || d === 'inline-block' || d === 'inline-flex') return true
    const w = parseFloat(div.style.width || '')
    // 宽度小于 360px 且没有 auto/100% 这种全宽特征的，视为行内小卡片
    if (w && w > 0 && w < 360 && div.style.width.indexOf('%') === -1) return true
    return false
  }

  function buildTdStyle(s: CSSStyleDeclaration): string {
    const decls: string[] = []
    KEEP_ON_TD.forEach((prop) => {
      const v = s.getPropertyValue(prop)
      if (!v) return
      decls.push(`${prop}:${v}`)
    })
    return decls.join(';')
  }

  Array.from(doc.body.querySelectorAll<HTMLElement>('div'))
    .filter(looksLikeDecoration)
    .forEach((div) => {
      if (isInlineLike(div)) {
        const span = doc.createElement('span')
        while (div.firstChild) span.appendChild(div.firstChild)
        // 把 div 的所有内联样式搬过来，并确保 display:inline-block
        span.setAttribute('style', div.getAttribute('style') || '')
        span.style.setProperty('display', 'inline-block')
        if (!span.style.verticalAlign) span.style.setProperty('vertical-align', 'middle')
        div.replaceWith(span)
      } else {
        const table = doc.createElement('table')
        table.setAttribute('cellpadding', '0')
        table.setAttribute('cellspacing', '0')
        table.style.setProperty('border-collapse', 'collapse')
        table.style.setProperty('width', '100%')

        // table 上保留 margin/width/max-width
        KEEP_ON_TABLE.forEach((prop) => {
          const v = div.style.getPropertyValue(prop)
          if (v) table.style.setProperty(prop, v)
        })

        const tr = doc.createElement('tr')
        const td = doc.createElement('td')
        td.setAttribute('style', buildTdStyle(div.style))
        td.setAttribute('valign', 'middle')
        while (div.firstChild) td.appendChild(div.firstChild)
        tr.appendChild(td)
        table.appendChild(tr)
        div.replaceWith(table)
      }
    })

  // 5) 清掉「块级容器之间为排版好看而留的换行/缩进」空白文本节点。
  //    浏览器会折叠这些空白，但公众号 contenteditable 会把它们当成真实回车，
  //    导致正文中间多出一串空行（与浏览器预览显示不一致）。
  //    只删「纯空白」且位于块级容器直接子级的文本节点；
  //    正文 <p>/<span> 内部真实文字与词间空格（其父不是块级容器）一律保留。
  const BLOCK_CONTAINERS = new Set([
    'section', 'div', 'td', 'th', 'blockquote',
    'ul', 'ol', 'table', 'tr', 'tbody', 'body', 'html',
  ])
  function cleanInterBlockWhitespace(root: HTMLElement) {
    Array.from(root.childNodes).forEach((child) => {
      if (child.nodeType === 1) {
        cleanInterBlockWhitespace(child as HTMLElement)
      } else if (child.nodeType === 3) {
        const parentTag = (child.parentElement?.tagName || '').toLowerCase()
        if (BLOCK_CONTAINERS.has(parentTag) && !/\S/.test(child.textContent || '')) {
          child.remove()
        }
      }
    })
  }
  cleanInterBlockWhitespace(doc.body)

  // 6) 去掉套模板时用于标记外壳的 data-meipi-shell 容器（保留其子节点），
  //    让复制产物只剩「正文 + 新外壳装饰」，无多余的包裹层进入公众号。
  doc.body.querySelectorAll<HTMLElement>('[data-meipi-shell]').forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
  })

  return doc.body.innerHTML
}
