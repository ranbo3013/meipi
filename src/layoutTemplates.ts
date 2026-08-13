// 一键排版 · 模板目录
// 维度：风格(style) / 用途(usage) / 行业(industry)
// 全部样式与脚手架均为原创编写，分类维度参照主流公众号编辑器的公开结构。
//
// 一个模板 = 某个「风格」+ 某个「用途」+ 若干「行业」标签的组合。
// 画廊按三维筛选，点卡片即把对应风格套用到当前文章，并可插入该用途的示例结构。

import { QR_CODE_BASE64 } from './assets/qrcode'

// 风格筛选顺序（与 themes.ts 的 id 对应）
export const STYLE_ORDER = [
  'minimal',
  'business',
  'literary',
  'fresh',
  'cartoon',
  'fashion',
  'dynamic',
  'china',
  'clean',
  'ins',
  'solar',
  'solar-summer',
  'summer-cool',
  'spring',
  'autumn',
  'campus',
  'freshblue',
  'winter',
  'travel',
  'cafe',
  'solar-autumn',
  'reportblue',
]

// 行业筛选项（"全部"由组件处理）
export const INDUSTRIES = [
  '教育',
  '医疗',
  '政务',
  '科技',
  '媒体',
  '旅游',
  '电商',
  '金融',
  '酒店',
]

export interface UsageDef {
  id: string
  name: string
  /** 该用途常见适用的行业，用于行业维度筛选 */
  industries: string[]
  /** 生成该用途的示例结构（语义 HTML），title 为文章标题占位 */
  scaffold: (title: string) => string
  /**
   * 可选：该用途的「首尾外壳」（顶部关注引导条 / 底部 END + 二维码签名）。
   * 一键排版「使用此模板」会把此外壳套到用户已有文章的首尾，正文保留。
   * 不提供则使用通用外壳 genericShell。
   */
  shell?: (title: string) => { head: string; foot: string }
}

/**
 * 通用外壳：顶部关注引导条 + 底部 END + 二维码签名栏。
 * 颜色采用全站橙色强调，所有未自带 shell 的用途套用此通用外壳。
 */
export function genericShell(title: string): { head: string; foot: string } {
  const head = `
<div style="margin:0 0 20px; padding:12px 16px; background:#fff3e9; border:1px solid #ffd9bf; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#9a4a16; font-size:14px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:10px;">
    <span style="font-size:18px;">📮</span>
    <span><a href="#" style="color:#ea580c; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们，不错过每篇好文</span>
  </div>
  <span style="font-size:18px;">✨</span>
</div>`
  const foot = `
<div style="margin:28px 0 12px; text-align:center; font-size:20px; font-weight:700; letter-spacing:4px; color:#ea580c;">END</div>
<div style="margin:12px auto 20px; max-width:84%; padding:14px; border:1.5px dashed #ffb888; border-radius:14px; text-align:center; color:#8a6a55; font-size:14px; line-height:1.7;">
  感谢你读到这里 · 长按识别二维码关注我们
</div>
<div style="margin:20px 0 4px; padding:16px; background:#fff7f2; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#b45309; margin-bottom:4px;">${title}</div>
    <div style="font-size:13px; color:#8a6a55; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
  return { head, foot }
}

/**
 * 把「头部外壳 + 正文 + 尾部外壳」包进带标记的 wrapper，写入编辑器。
 * head/foot 上的 data-meipi-shell 标记让「再次套模板」时能精准剥离旧外壳、保留正文，
 * 避免叠加；body 单独包一层，方便原样取回。
 * 注意：用属性标记而非 HTML 注释——注释在 contentEditable 编辑/序列化时极易被丢弃，
 * 这正是旧方案（注释标记）失效、导致换模板时旧外壳叠加的根因。
 */
export function wrapShell(head: string, body: string, foot: string): string {
  const clean = (s: string) => s.replace(/<!--\s*meipi-shell:[^>]*-->/g, '')
  return (
    `<div data-meipi-shell="head">${clean(head)}</div>` +
    `<div data-meipi-shell="body">${body}</div>` +
    `<div data-meipi-shell="foot">${clean(foot)}</div>`
  )
}

/** 删除容器内所有 meipi-shell 相关注释节点（兼容旧数据里残留的注释） */
function removeMeipiComments(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
  const toRemove: Comment[] = []
  let n: Node | null
  while ((n = walker.nextNode())) {
    const c = n as Comment
    if (/meipi-shell/.test(c.data)) toRemove.push(c)
  }
  toRemove.forEach((c) => c.remove())
}

/** 按内嵌注释区间剥离 head/foot（兼容夏日送清凉等自带 :head/:foot 注释的旧数据） */
function stripCommentRange(body: HTMLElement, kind: string) {
  const kids = Array.from(body.childNodes)
  let capturing = false
  const remove: ChildNode[] = []
  for (const node of kids) {
    if (node.nodeType === 8) {
      const data = (node as Comment).data
      if (new RegExp(`meipi-shell:\\s*start:\\s*${kind}\\s*`).test(data)) {
        capturing = true
        remove.push(node)
        continue
      }
      if (new RegExp(`meipi-shell:\\s*end:\\s*${kind}\\s*`).test(data)) {
        capturing = false
        remove.push(node)
        continue
      }
    }
    if (capturing) remove.push(node)
  }
  remove.forEach((n) => n.remove())
}

const LEGACY_STOP = new Set([
  'h1', 'h2', 'h3', 'p', 'blockquote', 'ul', 'ol', 'hr', 'pre', 'table', 'section',
])

/**
 * 兜底：注释已丢失的旧草稿，按文本锚点剥掉开头「关注引导条」与结尾「END/二维码」外壳。
 * 仅在开头/结尾连续的「非正文块」上生效；一旦遇到正文语义标签（h1/p/...）立即停止，
 * 正文内部若含这些词不会被误删。
 */
function stripLegacyHeadTail(body: HTMLElement) {
  // 开头：剥掉连续的「关注引导条」类装饰块，直到遇到第一个正文标签
  let n: ChildNode | null = body.firstChild
  while (n) {
    if (n.nodeType === 1) {
      const el = n as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (LEGACY_STOP.has(tag)) break
      const txt = el.textContent || ''
      if (
        txt.includes('点击蓝字') ||
        txt.includes('关注我们') ||
        txt.includes('不错过每篇好文')
      ) {
        const next = n.nextSibling
        n.remove()
        n = next
        continue
      }
      break
    } else if (n.nodeType === 3 && !/\S/.test(n.textContent || '')) {
      n = n.nextSibling
      continue
    } else {
      break
    }
  }
  // 结尾：剥掉连续的「END/二维码」类装饰块，直到遇到第一个正文标签
  let m: ChildNode | null = body.lastChild
  while (m) {
    if (m.nodeType === 1) {
      const el = m as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (LEGACY_STOP.has(tag)) break
      const txt = el.textContent || ''
      if (
        txt.includes('END') ||
        txt.includes('长按识别二维码') ||
        txt.includes('微信号') ||
        txt.includes('感谢你读到这里')
      ) {
        const prev = m.previousSibling
        m.remove()
        m = prev
        continue
      }
      break
    } else if (m.nodeType === 3 && !/\S/.test(m.textContent || '')) {
      m = m.previousSibling
      continue
    } else {
      break
    }
  }
}

/**
 * 剥离已套上的模板外壳，只保留用户正文（用于「再次套模板」前清除旧外壳）。
 * 剥离优先级：
 *   ① 新标记 data-meipi-shell="head"/"foot" → 精准删除、正文无忧；
 *   ② 内嵌注释区间（meipi-shell:start:head ... :end:head 等） → 兼容自带注释的旧数据；
 *   ③ 文本锚点兜底 → 兼容注释已丢失的旧草稿（开头关注条 / 结尾 END+二维码）。
 * 最终优先从 data-meipi-shell="body" 取回正文，无标记则取剩余全部。
 */
export function stripShell(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body
  removeMeipiComments(body)
  body
    .querySelectorAll('[data-meipi-shell="head"], [data-meipi-shell="foot"]')
    .forEach((el) => el.remove())
  stripCommentRange(body, 'head')
  stripCommentRange(body, 'foot')
  stripLegacyHeadTail(body)
  const bodyWrap = body.querySelector('[data-meipi-shell="body"]')
  const inner = bodyWrap ? bodyWrap.innerHTML : body.innerHTML
  return inner.trim()
}

export const USAGES: UsageDef[] = [
  {
    id: 'meeting',
    name: '会议通知',
    industries: ['政务', '教育'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>各位同事 / 伙伴：</p>
<p>现将有关事项通知如下，请知悉并准时参加。</p>
<h2>一、会议时间</h2>
<p>2026 年 X 月 X 日（周 X）上午 9:30 — 11:30</p>
<h2>二、会议地点</h2>
<p>XXX 会议室 / 线上会议链接</p>
<h2>三、会议议程</h2>
<ul><li>议程一</li><li>议程二</li><li>议程三</li></ul>
<h2>四、参会要求</h2>
<p>请提前准备好相关材料，准时到场。</p>
<hr/>
<small>联系人：XXX 　电话：XXX</small>
`,
  },
  {
    id: 'recruit',
    name: '招聘',
    industries: ['科技', '电商', '金融', '教育'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>我们正在寻找志同道合的你，一起把事情做得更好。</p>
<h2>岗位名称</h2>
<p>XXX 工程师 / 专员</p>
<h2>岗位职责</h2>
<ul><li>职责一</li><li>职责二</li></ul>
<h2>任职要求</h2>
<ul><li>要求一</li><li>要求二</li></ul>
<h2>薪资与福利</h2>
<p>面议，提供五险一金及成长空间。</p>
<blockquote><p>简历投递：XXX@xxx.com，注明「岗位 + 姓名」。</p></blockquote>
`,
  },
  {
    id: 'report',
    name: '总结报告',
    industries: ['商务', '政务', '科技'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>本期工作已告一段落，现将整体情况总结如下。</p>
<h2>一、工作回顾</h2>
<p>概述本阶段完成的主要内容。</p>
<h2>二、关键数据</h2>
<ul><li>指标一：XXX</li><li>指标二：XXX</li></ul>
<h2>三、成果与亮点</h2>
<p>提炼最具价值的产出。</p>
<h2>四、问题与反思</h2>
<p>客观说明不足与改进方向。</p>
<h2>五、下阶段计划</h2>
<p>明确下一步目标与节奏。</p>
`,
  },
  {
    id: 'activity',
    name: '活动',
    industries: ['教育', '旅游', '媒体'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>一场值得期待的相遇，诚邀你共同参与。</p>
<h2>活动主题</h2>
<p>XXX</p>
<h2>时间地点</h2>
<p>时间：XXXX 　地点：XXXX</p>
<h2>活动流程</h2>
<ul><li>签到</li><li>主题分享</li><li>互动交流</li></ul>
<h2>报名方式</h2>
<p>扫码或点击链接填写信息，名额有限。</p>
`,
  },
  {
    id: 'news',
    name: '新闻资讯',
    industries: ['媒体', '政务', '科技'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>（导语）用一句话概括事件核心。</p>
<h2>事件背景</h2>
<p>交代来龙去脉。</p>
<h2>主要内容</h2>
<p>展开叙述关键信息。</p>
<h2>影响与意义</h2>
<p>说明事件带来的变化。</p>
<blockquote><p>延伸阅读：相关背景资料。</p></blockquote>
`,
  },
  {
    id: 'commend',
    name: '表彰',
    industries: ['政务', '教育'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>有这样一群人，把平凡的事做到了不平凡。</p>
<h2>表彰对象</h2>
<p>XXX 同志 / 团队</p>
<h2>主要事迹</h2>
<p>简述其突出贡献与感人细节。</p>
<h2>颁奖词</h2>
<blockquote><p>“XXX”</p></blockquote>
<p>愿这份荣誉，成为继续前行的光。</p>
`,
  },
  {
    id: 'person',
    name: '人物介绍',
    industries: ['媒体', '教育'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>（一句话标签）用一句有力量的话定义这个人。</p>
<h2>他是谁</h2>
<p>基本背景与身份。</p>
<h2>高光时刻</h2>
<ul><li>成就一</li><li>成就二</li></ul>
<h2>他的态度</h2>
<p>提炼其价值观或方法论。</p>
<blockquote><p>“一句代表性的话。”</p></blockquote>
`,
  },
  {
    id: 'science',
    name: '科普',
    industries: ['教育', '医疗', '科技'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>（引入）从一个生活现象讲起。</p>
<h2>核心知识点</h2>
<p>用通俗语言解释概念。</p>
<h2>原理是什么</h2>
<p>说明背后的机理。</p>
<h2>举个栗子</h2>
<p>用贴近生活的例子帮助理解。</p>
<hr/>
<small>知识点参考自公开科普资料。</small>
`,
  },
  {
    id: 'product',
    name: '产品介绍',
    industries: ['电商', '科技'],
    scaffold: (t) => `
<h1>${t}</h1>
<p>一句话说清它解决什么问题。</p>
<h2>核心亮点</h2>
<ul><li>亮点一</li><li>亮点二</li><li>亮点三</li></ul>
<h2>适用人群</h2>
<p>谁最需要它。</p>
<h2>关键参数</h2>
<p>规格 / 价格 / 交付等信息。</p>
<blockquote><p>立即了解：XXX 链接</p></blockquote>
`,
  },
  {
    id: 'solar',
    name: '节气推文',
    industries: ['媒体', '旅游', '政务'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:14px 18px; background:#a3b33a; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#fff; font-size:15px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:12px;">
    <span style="font-size:24px;">🍂</span>
    <span><a href="#" style="color:#fff; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们</span>
  </div>
  <span style="font-size:22px;">🧺</span>
</div>`
      const foot = `
<div style="margin:30px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:4px; color:#7a8745;">END</div>
<div style="margin:14px auto 22px; max-width:82%; padding:14px; border:1.5px dashed #a3b33a; border-radius:14px; text-align:center; color:#5c6b2e; font-size:14px; line-height:1.7;">
  感谢你读到这里 · 愿时序更迭皆有诗意
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f3f6e6; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5c6b2e; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7a8745; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      // 立秋占位图
      const heroImg =
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNmU2Ii8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjN2E4NzQ1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BdXR1bW4gSW1hZ2U8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI3MiUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOGE4MjVhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5SZXBsYWNlIHdpdGggeW91ciBwaG90bzwvdGV4dD48L3N2Zz4='
      return `
<!-- 顶部关注引导条 -->
<div style="margin:0 0 22px; padding:14px 18px; background:#a3b33a; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#fff; font-size:15px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:12px;">
    <span style="font-size:24px;">🍂</span>
    <span><a href="#" style="color:#fff; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们</span>
  </div>
  <span style="font-size:22px;">🧺</span>
</div>

<h1>${t}</h1>

<p>夏意渐消，秋风始至。立秋，作为二十四节气中第十三个节气，也是秋季的第一个节气，标志着盛夏落幕、金秋启序。万物自此褪去盛夏的燥热张扬，步入收敛沉淀的时节。藏于时序更迭间的立秋，不仅是自然气候的转折点，更承载着千年的农耕文明与民俗底蕴。</p>

<!-- 编号小标题 -->
<div style="margin:28px 0 18px; display:flex; align-items:center; gap:16px;">
  <div style="width:44px; height:44px; border-radius:50%; background:#f3f6e6; color:#7a8745; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; flex:0 0 44px;">01</div>
  <div style="flex:1; font-size:18px; font-weight:700; color:#5c6b2e;">溯源立秋 顺时而生</div>
  <span style="font-size:22px;">🍉</span>
</div>

<!-- 带装饰边框的大图 -->
<div style="margin:18px 0 22px; padding:8px; background:#eef2d6; border-radius:18px; position:relative;">
  <div style="position:absolute; top:14px; right:14px; width:16px; height:16px; border-radius:50%; background:#d4e08d;"></div>
  <div style="position:absolute; bottom:14px; left:14px; width:16px; height:16px; border-radius:50%; background:#d4e08d;"></div>
  <img src="${heroImg}" alt="立秋配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<p>立秋节气的诞生，根植于古人顺应天时、深耕农耕的生活智慧，是古人长期观测天象、总结物候的智慧结晶。</p>
<p>从字面释义来看，"立"为起始、开端，"秋"为收敛、成熟。《月令七十二候集解》中记载："七月节，立字解见春。秋，揪也，物于此而揪敛也。"意为立秋之后，天地万物结束蓬勃生长的态势，开始收敛蓄力，为冬藏做准备。</p>
`
    },
  },
  {
    id: 'solarSummer',
    name: '小暑推文',
    industries: ['媒体', '旅游', '政务'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:12px 16px; background:#bfe3cf; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#3a6b4a; font-size:14px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:10px;">
    <span style="font-size:20px;">🪷</span>
    <span><a href="#" style="color:#1f5c33; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们</span>
  </div>
  <span style="font-size:20px;">🍃</span>
</div>`
      const foot = `
<div style="margin:30px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:4px; color:#f4a4b4;">END</div>
<div style="margin:14px auto 22px; max-width:82%; padding:14px; border:1.5px dashed #f4a4b4; border-radius:14px; text-align:center; color:#7a6a6a; font-size:14px; line-height:1.7;">
  感谢你读到这里 · 愿这个夏天清欢相伴<br/>小暑至 盛夏始
</div>
<div style="margin:24px 0 4px; padding:16px; background:#fff5f7; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#4a7c59; margin-bottom:4px;">小暑至 盛夏始</div>
    <div style="font-size:13px; color:#7a6a6a; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const lotus =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><rect width="100%" height="100%" fill="#ffeef2"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#c98aa0" text-anchor="middle">Lotus Image</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#d9a8b8" text-anchor="middle">Replace with your photo</text></svg>',
        )
      const qr = QR_CODE_BASE64
      return `
<!-- 顶部关注引导条 -->
<div style="margin:0 0 22px; padding:12px 16px; background:#bfe3cf; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#3a6b4a; font-size:14px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:10px;">
    <span style="font-size:20px;">🪷</span>
    <span><a href="#" style="color:#1f5c33; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们</span>
  </div>
  <span style="font-size:20px;">🍃</span>
</div>

<h1>${t}</h1>

<div style="text-align:center; color:#a3c9b5; font-size:13px; letter-spacing:3px; margin:-6px 0 18px; font-style:italic;">minor heat</div>

<p>小暑，是二十四节气中第十一个节气，也是夏季的第五个节气。暑，意为炎热；小暑即"小热"，此时天气已热，却尚未到最热，正如民谚所云"小暑不算热，大暑三伏天"。</p>

<!-- Part.01 编号小标题 -->
<div style="margin:28px 0 16px; display:flex; align-items:center; gap:14px;">
  <div style="flex:0 0 auto; width:46px; height:46px; border-radius:50%; background:#f4a4b4; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; box-shadow:0 2px 6px rgba(244,164,180,.4);">01</div>
  <div style="flex:1; font-size:18px; font-weight:700; color:#4a7c59;">小暑来源</div>
  <span style="font-size:22px;">🪷</span>
</div>

<p>小暑之名，源于古人对气候的细腻体察。《月令七十二候集解》记载："六月节……暑，热也，就热之中分为大小，月初为小，月中为大，今则热气犹小也。"小暑时节，南风裹挟着湿热扑面而来，荷香蝉鸣渐次登场，天地间一派生机盎然的盛夏景象。</p>

<!-- Part.02 编号小标题 -->
<div style="margin:28px 0 16px; display:flex; align-items:center; gap:14px;">
  <div style="flex:0 0 auto; width:46px; height:46px; border-radius:50%; background:#f4a4b4; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; box-shadow:0 2px 6px rgba(244,164,180,.4);">02</div>
  <div style="flex:1; font-size:18px; font-weight:700; color:#4a7c59;">小暑三候</div>
  <span style="font-size:22px;">🌿</span>
</div>

<p>古人将小暑分为三候："一候温风至；二候蟋蟀居宇；三候鹰始鸷。"温热的风取代了清凉，蟋蟀躲到墙角避暑，雏鹰在长空学习搏击。万物在灼热中依旧从容生长，藏着中国人顺应天时的生活智慧。</p>

<!-- 带粉色边框的荷花主图 -->
<div style="margin:18px 0 22px; padding:6px; background:#fff; border:3px solid #f4a4b4; border-radius:18px; position:relative;">
  <div style="position:absolute; top:-16px; right:18px; font-size:34px;">🪷</div>
  <img src="${lotus}" alt="荷花配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<p>一池清荷，半盏清凉。小暑时节，正是赏荷最好光景——粉瓣初展，翠叶田田，于喧嚣夏日里留一方心静自然凉。</p>

<!-- END 文字 -->
<div style="margin:30px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:4px; color:#f4a4b4;">END</div>

<!-- END 卡片 -->
<div style="margin:14px auto 22px; max-width:82%; padding:14px; border:1.5px dashed #f4a4b4; border-radius:14px; text-align:center; color:#7a6a6a; font-size:14px; line-height:1.7;">
  感谢你读到这里 · 愿这个夏天清欢相伴<br/>小暑至 盛夏始
</div>

<!-- 底部二维码 + 签名 -->
<div style="margin:24px 0 4px; padding:16px; background:#fff5f7; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${qr}" alt="二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#4a7c59; margin-bottom:4px;">小暑至 盛夏始</div>
    <div style="font-size:13px; color:#7a6a6a; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'summerRelief',
    name: '夏日送清凉',
    industries: ['政务'],
    shell: (t) => {
      const head = `
<!-- meipi-shell:start:head -->
<div style="margin:0 0 22px; padding:12px 16px; background:#e0f2fe; border:1px solid #bae6fd; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#075985; font-size:14px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:10px;">
    <span style="font-size:22px;">🧊</span>
    <span><a href="#" style="color:#0284c7; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们</span>
  </div>
  <span style="font-size:22px;">🍉</span>
</div>
<!-- meipi-shell:end:head -->`
      const foot = `
<!-- meipi-shell:start:foot -->
<!-- END 装饰 -->
<div style="margin:32px 0 14px; display:flex; align-items:center; justify-content:center; gap:10px;">
  <div style="width:44px; height:44px; background:#fde047; border-radius:6px 6px 6px 2px; transform:rotate(-6deg); box-shadow:0 2px 6px rgba(253,224,71,.45);"></div>
  <div style="padding:9px 18px; background:#38bdf8; color:#fff; border-radius:20px; font-size:18px; font-weight:700; letter-spacing:3px;">END</div>
  <div style="width:18px; height:18px; border-radius:50%; background:#fde047; box-shadow:0 2px 5px rgba(253,224,71,.45);"></div>
</div>

<!-- 二维码 + 活动标签 -->
<div style="margin:18px auto 24px; max-width:88%; padding:18px 14px 14px; border:2px solid #bae6fd; border-radius:16px; background:#f0f9ff; text-align:center;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:140px; height:140px; border-radius:8px; display:block; margin:0 auto 10px; object-fit:cover;" />
  <div style="display:inline-block; padding:6px 18px; background:#38bdf8; color:#fff; border-radius:20px; font-size:14px; font-weight:700;">${t}</div>
</div>

<!-- 使用备注 -->
<div style="text-align:center; color:#64748b; font-size:13px; line-height:2;">
  使用备注：<br/>
  图片｜来源 135 图库（ID：87200）<br/>
  文案｜来源 135 AI 写作
</div>
<!-- meipi-shell:end:foot -->`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><rect width="100%" height="100%" fill="#e0f2fe"/><circle cx="75%" cy="25%" r="45" fill="#fde047" opacity=".35"/><text x="50%" y="55%" font-family="sans-serif" font-size="22" fill="#0c4a6e" text-anchor="middle">Summer Relief Image</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#475569" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<!-- 顶部关注引导条 -->
<div style="margin:0 0 22px; padding:12px 16px; background:#e0f2fe; border:1px solid #bae6fd; border-radius:12px; display:flex; align-items:center; justify-content:space-between; color:#075985; font-size:14px; line-height:1.4;">
  <div style="display:flex; align-items:center; gap:10px;">
    <span style="font-size:22px;">🧊</span>
    <span><a href="#" style="color:#0284c7; text-decoration:underline; font-weight:700;">点击蓝字</a> 关注我们</span>
  </div>
  <span style="font-size:22px;">🍉</span>
</div>

<h1>${t}</h1>

<p>连日来，滚滚热浪席卷城市，气温节节攀升，多地连续发布高温橙色乃至红色预警信号。当大多数人选择在空调房内躲避酷暑时，环卫工人、外卖骑手、快递小哥、建筑工人、市政维修人员等户外劳动者依然坚守在城市的每一个角落，用汗水维系着城市的正常运转。</p>

<!-- 蓝色标题卡片 -->
<div style="margin:28px 0 18px; padding:12px 18px; background:#38bdf8; border-radius:14px; display:inline-flex; align-items:center; gap:10px; color:#fff; box-shadow:0 4px 12px rgba(56,189,248,.35);">
  <span style="font-size:22px;">☀️</span>
  <span style="font-size:18px; font-weight:700; letter-spacing:1px;">夏日送清凉</span>
</div>

<!-- 带 SUMMER 标签的大图 -->
<div style="margin:18px 0 22px; padding:7px; background:#e0f2fe; border-radius:16px; position:relative;">
  <div style="position:absolute; top:14px; left:14px; padding:4px 12px; background:#fde047; color:#92400e; border-radius:20px; font-size:13px; font-weight:700; letter-spacing:1px;">SUMMER</div>
  <img src="${heroImg}" alt="夏日送清凉慰问活动配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<p>为有效应对持续的高温天气，各类"爱心冰柜"与"清凉驿站"相继在城市的街头巷尾落地生根。这些补给站不仅配备了冰镇饮用水，还涵盖了电解质饮料、盐汽水等专业解暑物资，旨在为奔波在烈日下的劳动者提供即时的能量补充与身体呵护。</p>

<!-- END 装饰 -->
<div style="margin:32px 0 14px; display:flex; align-items:center; justify-content:center; gap:10px;">
  <div style="width:44px; height:44px; background:#fde047; border-radius:6px 6px 6px 2px; transform:rotate(-6deg); box-shadow:0 2px 6px rgba(253,224,71,.45);"></div>
  <div style="padding:9px 18px; background:#38bdf8; color:#fff; border-radius:20px; font-size:18px; font-weight:700; letter-spacing:3px;">END</div>
  <div style="width:18px; height:18px; border-radius:50%; background:#fde047; box-shadow:0 2px 5px rgba(253,224,71,.45);"></div>
</div>

<!-- 二维码 + 活动标签 -->
<div style="margin:18px auto 24px; max-width:88%; padding:18px 14px 14px; border:2px solid #bae6fd; border-radius:16px; background:#f0f9ff; text-align:center;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:140px; height:140px; border-radius:8px; display:block; margin:0 auto 10px; object-fit:cover;" />
  <div style="display:inline-block; padding:6px 18px; background:#38bdf8; color:#fff; border-radius:20px; font-size:14px; font-weight:700;">${t}</div>
</div>

<!-- 使用备注 -->
<div style="text-align:center; color:#64748b; font-size:13px; line-height:2;">
  使用备注：<br/>
  图片｜来源 135 图库（ID：87200）<br/>
  文案｜来源 135 AI 写作
</div>
`
    },
  },
  {
    id: 'springLate',
    name: '春日散文',
    industries: ['媒体', '旅游', '教育'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #aca2ce; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#7c6fb0; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">🌿</span>
  <span><a href="#" style="color:#7c6fb0; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">🌿</span>
</div>`
      const foot = `
<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#aca2ce;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #aca2ce; border-radius:5px; background:#ffffff; text-align:center; color:#7c6fb0; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 春日迟迟，春景熙熙<br/>愿这一程春色，温柔了你的岁月
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f7f4fc; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#7c6fb0; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#8b7cc0; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef5e3"/><stop offset="1" stop-color="#e9e2f5"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#8b7cc0" text-anchor="middle">Spring Image</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#a99fc8" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<!-- 顶部关注引导条 -->
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #aca2ce; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#7c6fb0; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">🌿</span>
  <span><a href="#" style="color:#7c6fb0; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">🌿</span>
</div>

<h1>${t}</h1>

<p>春日迟迟，并非姗姗来迟的怠慢，而是大自然最温柔的铺垫。春景熙熙，是阳光碎成金箔洒满山川的慷慨，是风里裹着花香拂过人间的慈悲。</p>

<div style="margin:28px 0 16px; text-align:center; color:#7c6fb0; font-size:18px; font-weight:700; letter-spacing:2px;">一帘微雨，半盏春色</div>

<p>春水碧于天，画船听雨眠。这是江南的春，也是每个人心底最柔软的梦境。细雨如丝，轻轻垂落在天地间，像是天空写给大地的情书。</p>

<div style="margin:18px 0 22px; padding:8px; background:#f7f4fc; border:2px solid #aca2ce; border-radius:16px;">
  <img src="${heroImg}" alt="春日配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<p>巷子深处，传来卖花阿婆悠长的叫卖声："栀子花——白兰花——"那声音穿过雨帘，带着湿润的甜意，像是春天本身的呼唤。</p>

<div style="margin:28px 0 16px; text-align:center; color:#7c6fb0; font-size:18px; font-weight:700; letter-spacing:2px;">草木蔓发，春山可望</div>

<p>最美人间三月天。三月的山，是一首渐次展开的长诗。山脚是浅草才能没马蹄的嫩绿，山腰是杂花生树的绚烂，山顶是松柏经冬犹存的苍翠。</p>

<blockquote><p>其实春天教会我们的，不只是欣赏美好，更是珍惜当下。花开有时，花落有时，聚散有时，悲欢有时。</p></blockquote>

<div style="margin:28px 0 16px; text-align:center; color:#7c6fb0; font-size:18px; font-weight:700; letter-spacing:2px;">诗酒趁年华</div>

<p>春日的黄昏来得格外缓慢。太阳像是舍不得离开，在远山的轮廓上停留了又停留，直到把整片天空都染成玫瑰色。</p>

<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#aca2ce;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #aca2ce; border-radius:5px; background:#ffffff; text-align:center; color:#7c6fb0; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 春日迟迟，春景熙熙<br/>愿这一程春色，温柔了你的岁月
</div>

<div style="margin:24px 0 4px; padding:16px; background:#f7f4fc; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#7c6fb0; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#8b7cc0; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'autumnCool',
    name: '天凉好个秋',
    industries: ['媒体', '旅游', '教育'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #036eb8; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#036eb8; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">🍃</span>
  <span><a href="#" style="color:#036eb8; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">🍃</span>
</div>`
      const foot = `
<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#036eb8;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #036eb8; border-radius:5px; background:#ffffff; text-align:center; color:#2e5e93; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 天凉好个秋<br/>愿这一季清寒，温柔了你的流年
</div>
<div style="margin:24px 0 4px; padding:16px; background:#eef7f7; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#036eb8; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#3a5a78; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ace1f3"/><stop offset="1" stop-color="#edf7f7"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#2e5e93" text-anchor="middle">Autumn Image</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#5a8aa8" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<!-- 顶部关注引导条 -->
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #036eb8; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#036eb8; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">🍃</span>
  <span><a href="#" style="color:#036eb8; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">🍃</span>
</div>

<h1>${t}</h1>

<p>天凉好个秋。风掠过枝头时，悄悄换了调子，不再裹挟着夏的燥热，转而带着清冽的凉意，把人间染成一片温柔的蓝。</p>

<h2>一叶知秋，万物渐静</h2>

<p>梧桐叶上三更雨，叶叶声声是别离。一片叶子落下的弧度，便写尽了整个秋天的序言。草木收敛了张扬，山川也学会了沉默。</p>

<div style="margin:18px 0 22px; padding:8px; background:#eef7f7; border:2px solid #ace1f3; border-radius:16px;">
  <img src="${heroImg}" alt="秋日配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<p>巷口的桂花不知何时开了，甜香顺着风钻进窗棂，像一封迟到却准时赴约的信，安静地落在案头。</p>

<blockquote><p>其实秋天教会我们的，是懂得收敛，也懂得沉淀。繁华落尽处，方见本心。</p></blockquote>

<h2>风起云涌，秋意渐浓</h2>

<p>最美的秋，不在远方，而在抬头看见的那一角天空——高远、澄澈、蓝得没有一丝杂念，像极了我们年少时未完的梦。</p>

<h2>岁月沉淀，且共从容</h2>

<p>愿你在这一季清寒里，慢下来，听风，看云，煮一壶茶，与往事和解。天凉好个秋，人间好时节。</p>

<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#036eb8;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #036eb8; border-radius:5px; background:#ffffff; text-align:center; color:#2e5e93; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 天凉好个秋<br/>愿这一季清寒，温柔了你的流年
</div>

<div style="margin:24px 0 4px; padding:16px; background:#eef7f7; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#036eb8; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#3a5a78; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'back2school',
    name: '开学通知',
    industries: ['教育'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#fffbf5; border:2px solid #fec55c; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#d98f2a; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">📚</span>
  <span><a href="#" style="color:#d98f2a; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">📚</span>
</div>`
      const foot = `
<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#fec55c;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #fec55c; border-radius:5px; background:#fffbf5; text-align:center; color:#d98f2a; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 新学期，新起点<br/>愿你在书海里，找到属于自己的光
</div>
<div style="margin:24px 0 4px; padding:16px; background:#faf3e8; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#d98f2a; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#b08a3a; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fef0cf"/><stop offset="1" stop-color="#faf3e8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#d98f2a" text-anchor="middle">Campus Image</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#c9a85a" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:8px 18px; background:#fffbf5; border:2px solid #fec55c; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#d98f2a; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">📚</span>
  <span><a href="#" style="color:#d98f2a; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">📚</span>
</div>

<h1>${t}</h1>

<p>暑假余额已不足，新学期的钟声即将敲响。经过一个假期的休整，相信你已经攒满了能量，准备迎接新的挑战。</p>

<h2>开学时间安排</h2>

<p>请同学们于规定时间到校报到，携带好课本、作业与相关证件，调整作息，以饱满的精神状态开启新学期。</p>

<div style="margin:18px 0 22px; padding:8px; background:#faf3e8; border:2px solid #fec55c; border-radius:16px;">
  <img src="${heroImg}" alt="开学配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>校园管理要求</h2>

<p>校园内请遵守秩序，爱护公共设施；上下学注意交通安全，遇到问题及时与老师、家长沟通。</p>

<blockquote><p>新的学期，愿你不慌不忙，在自己的节奏里稳步向前；愿每一次努力，都被时光温柔以待。</p></blockquote>

<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#fec55c;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #fec55c; border-radius:5px; background:#fffbf5; text-align:center; color:#d98f2a; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 新学期，新起点<br/>愿你在书海里，找到属于自己的光
</div>

<div style="margin:24px 0 4px; padding:16px; background:#faf3e8; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#d98f2a; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#b08a3a; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'literaryfresh',
    name: '文艺随笔',
    industries: ['媒体'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #d4ebff; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#59aae8; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">✿</span>
  <span><a href="#" style="color:#59aae8; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">✿</span>
</div>`
      const foot = `
<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#59aae8;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #d4ebff; border-radius:5px; background:#f5faff; text-align:center; color:#59aae8; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 时光清浅，岁月留香<br/>愿这一程文艺，温柔了你的日常
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f5faff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#59aae8; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7bb8e8; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf4fd"/><stop offset="1" stop-color="#f5faff"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#59aae8" text-anchor="middle">Fresh Image</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#9cc8ee" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #d4ebff; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#59aae8; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">✿</span>
  <span><a href="#" style="color:#59aae8; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">✿</span>
</div>

<h1>${t}</h1>

<p>我站在光阴的渡口，回首那逝去的时光。那些尘封的记忆，如同一颗颗温润的珠子，被岁月串成了一条闪光的项链。</p>

<blockquote><p>慢下来，才看得见生活里藏着的温柔；静下来，才听得到心底真实的声音。</p></blockquote>

<div style="margin:18px 0 22px; padding:8px; background:#f5faff; border:2px solid #d4ebff; border-radius:16px;">
  <img src="${heroImg}" alt="文艺配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>一抹清新的蓝</h2>

<p>风把云朵揉成柔软的形状，天光在水面铺开一层淡蓝。原来文艺从不遥远，它就在每一次认真生活的缝隙里。</p>

<p>愿我们都能在喧嚣中，为自己留一方清净；在匆忙里，守住一份清新的欢喜。</p>

<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#59aae8;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #d4ebff; border-radius:5px; background:#f5faff; text-align:center; color:#59aae8; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 时光清浅，岁月留香<br/>愿这一程文艺，温柔了你的日常
</div>

<div style="margin:24px 0 4px; padding:16px; background:#f5faff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#59aae8; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7bb8e8; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'wintertravel',
    name: '冬日出游',
    industries: ['旅游'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #80baf8; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#2f7fd0; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">❄️</span>
  <span><a href="#" style="color:#2f7fd0; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">❄️</span>
</div>`
      const foot = `
<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#80baf8;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #80baf8; border-radius:5px; background:#f6faff; text-align:center; color:#2f7fd0; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 寒假畅心游<br/>愿这一程风雪，温柔了你的旅途
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f6faff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#2f7fd0; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#5a9be0; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcebfb"/><stop offset="1" stop-color="#f6faff"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#2f7fd0" text-anchor="middle">Winter Trip</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#8ab4e8" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #80baf8; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#2f7fd0; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px;">❄️</span>
  <span><a href="#" style="color:#2f7fd0; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px;">❄️</span>
</div>

<h1>${t}</h1>

<p>寒假的风，带着清冽的甜。背起行囊，去赴一场与远方的约定——雪山、温泉、古镇的灯，都在等你。</p>

<h2>冬日游玩推荐</h2>

<p>去看一场真正的雪吧。在银装素裹的天地间，呵一口白气，踩出一串属于自己的脚印，把烦恼都留在城市里。</p>

<div style="margin:18px 0 22px; padding:8px; background:#f6faff; border:2px solid #80baf8; border-radius:16px;">
  <img src="${heroImg}" alt="冬日配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>出行注意事项</h2>

<p>防寒保暖是第一要务，备好羽绒、暖贴与保湿；冰雪路面注意防滑，行程留有余地，平安才是最美的风景。</p>

<blockquote><p>旅行的意义，不在于去过多少地方，而在于在路上，遇见了更松弛的自己。</p></blockquote>

<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#80baf8;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #80baf8; border-radius:5px; background:#f6faff; text-align:center; color:#2f7fd0; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 寒假畅心游<br/>愿这一程风雪，温柔了你的旅途
</div>

<div style="margin:24px 0 4px; padding:16px; background:#f6faff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#2f7fd0; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#5a9be0; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'travelnote',
    name: '旅途拾光',
    industries: ['旅游'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #b1cff3; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#5f7ad2; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px; color:#ffb373;">●</span>
  <span><a href="#" style="color:#5f7ad2; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px; color:#ffb373;">●</span>
</div>`
      const foot = `
<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#ffb373;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #ffd5b2; border-radius:5px; background:#fff4ec; text-align:center; color:#c98a4a; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 旅途拾光<br/>愿每一程山水，温柔了你的时光
</div>
<div style="margin:24px 0 4px; padding:16px; background:#eaf4ff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5f7ad2; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7fa6d8; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9b8"/><stop offset="1" stop-color="#cfe4fb"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#5f7ad2" text-anchor="middle">Travel</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#7fa6d8" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #b1cff3; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#5f7ad2; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px; color:#ffb373;">●</span>
  <span><a href="#" style="color:#5f7ad2; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px; color:#ffb373;">●</span>
</div>

<h1>${t}</h1>

<p>背起行囊，把日常的琐碎留在身后。去看山川湖海的辽阔，去听古镇巷陌的烟火，让风把心事一一吹散。</p>

<h2>踏足山川湖海</h2>

<p>旅行的妙处，不在于抵达，而在于路上那些不期而遇的温柔——一朵云、一阵风、一个微笑，都成了记忆里的光。</p>

<div style="margin:18px 0 22px; padding:8px; background:#eaf4ff; border:2px solid #b1cff3; border-radius:16px;">
  <img src="${heroImg}" alt="旅途配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>走遍祖国各地</h2>

<p>从南到北，从东到西，每一寸土地都有它的脾气与深情。慢慢走，认真看，才算不辜负这一生。</p>

<blockquote><p>旅行的意义，不在于去过多少地方，而在于在路上，遇见了更松弛的自己。</p></blockquote>

<div style="margin:32px 0 14px; text-align:center; font-size:22px; font-weight:700; letter-spacing:6px; color:#ffb373;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #ffd5b2; border-radius:5px; background:#fff4ec; text-align:center; color:#c98a4a; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 旅途拾光<br/>愿每一程山水，温柔了你的时光
</div>

<div style="margin:24px 0 4px; padding:16px; background:#eaf4ff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5f7ad2; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7fa6d8; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'cafetime',
    name: '咖啡时光',
    industries: ['餐饮'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #7fa6cf; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#5a7ba6; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px; color:#f8e1ab;">●</span>
  <span><a href="#" style="color:#5a7ba6; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px; color:#f8e1ab;">●</span>
</div>`
      const foot = `
<div style="margin:32px 0 16px; text-align:center; font-size:16px; font-weight:700; letter-spacing:4px; color:#7fa6cf; border:1px solid #7fa6cf; border-radius:20px; padding:4px 0; max-width:38%; margin-left:auto; margin-right:auto;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #f8e1ab; border-radius:5px; background:#fbf3e0; text-align:center; color:#c49a5a; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 咖啡时光<br/>愿每一杯温热，慢煮了你的日常
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f5f9fc; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5a7ba6; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7fa6cf; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e1ab"/><stop offset="1" stop-color="#dbe7f3"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#5a7ba6" text-anchor="middle">Cafe</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#7fa6cf" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:8px 18px; background:#ffffff; border:2px solid #7fa6cf; border-radius:25px; display:flex; align-items:center; justify-content:center; color:#5a7ba6; font-size:15px; line-height:1.5;">
  <span style="font-size:16px; margin-right:8px; color:#f8e1ab;">●</span>
  <span><a href="#" style="color:#5a7ba6; text-decoration:none; font-weight:700;">点击蓝字</a> 关注我们</span>
  <span style="font-size:16px; margin-left:8px; color:#f8e1ab;">●</span>
</div>

<h1>${t}</h1>

<p>巷角那家小店，木质门牌被岁月磨得温润。推门进来，咖啡香裹着轻音乐，把城市的喧嚣轻轻关在门外。</p>

<h2>关于这家店</h2>

<p>手冲、拿铁、脏脏包，每一杯都慢工出细活。店主说，咖啡不是快消品，是值得坐下来好好对待的一段时光。</p>

<div style="margin:18px 0 22px; padding:8px; background:#f5f9fc; border:2px solid #7fa6cf; border-radius:16px;">
  <img src="${heroImg}" alt="咖啡店配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>推荐单品</h2>

<p>焦糖玛奇朵的甜，与美式的苦，都是生活本来的味道。挑一杯合心意的，配一本旧书，便是最好的下午。</p>

<blockquote><p>慢一点，再慢一点。让咖啡的温度，焐热那些被匆匆错过的瞬间。</p></blockquote>

<div style="margin:32px 0 16px; text-align:center; font-size:16px; font-weight:700; letter-spacing:4px; color:#7fa6cf; border:1px solid #7fa6cf; border-radius:20px; padding:4px 0; max-width:38%; margin-left:auto; margin-right:auto;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #f8e1ab; border-radius:5px; background:#fbf3e0; text-align:center; color:#c49a5a; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 咖啡时光<br/>愿每一杯温热，慢煮了你的日常
</div>

<div style="margin:24px 0 4px; padding:16px; background:#f5f9fc; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5a7ba6; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#7fa6cf; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'liqiu',
    name: '秋日时光',
    industries: ['媒体', '生活'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:9px 40px; background:#a6bb30; border-radius:25px; text-align:center; color:#ffffff; font-size:15px; line-height:1.6;">
  <span style="font-weight:700;">点击蓝字</span> 关注我们
</div>`
      const foot = `
<div style="margin:32px 0 16px; text-align:center; font-size:16px; font-weight:700; letter-spacing:4px; color:#a6bb30; border:1px solid #a6bb30; border-radius:20px; padding:4px 0; max-width:38%; margin-left:auto; margin-right:auto;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #ffeb9a; border-radius:5px; background:#f7fbc4; text-align:center; color:#5c6b2e; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 秋日时光<br/>愿这一季清欢，温柔了你的流年
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f7fbc4; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5c6b2e; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#8a9a3a; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffeb9a"/><stop offset="1" stop-color="#f7fbc4"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#5c6b2e" text-anchor="middle">立秋</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#8a9a3a" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:9px 40px; background:#a6bb30; border-radius:25px; text-align:center; color:#ffffff; font-size:15px; line-height:1.6;">
  <span style="font-weight:700;">点击蓝字</span> 关注我们
</div>

<h1>${t}</h1>

<p>立秋，是夏的尾声，也是秋的序章。风里开始有了凉意，蝉声渐弱，桂香未至，恰好是一年里最宜人的过渡。</p>

<h2>溯源立秋 顺时而生</h2>

<p>一叶梧桐一报秋，稻花田里话丰收。古人以「立秋」为暑去凉来的转折点，此后阳气渐收、阴气渐长，万物从繁盛走向沉静。</p>

<h2>立秋三候</h2>

<p>一候凉风至，二候白露生，三候寒蝉鸣。每一候都是自然写给季节的信，提醒我们慢下脚步，去听风、去看露、去惜别最后的蝉鸣。</p>

<div style="margin:18px 0 22px; padding:8px; background:#f7fbc4; border:2px solid #e0e25e; border-radius:16px;">
  <img src="${heroImg}" alt="立秋配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>立秋习俗 秋日期许</h2>

<p>啃秋、晒秋、贴秋膘，都是把对丰收的欢喜，妥帖地安放进日子里。愿你在这个秋天，有所获，亦有所安。</p>

<blockquote><p>人间忽晚，山河已秋。愿所有的等待，都在这个季节里，结出温柔的果。</p></blockquote>

<div style="margin:32px 0 16px; text-align:center; font-size:16px; font-weight:700; letter-spacing:4px; color:#a6bb30; border:1px solid #a6bb30; border-radius:20px; padding:4px 0; max-width:38%; margin-left:auto; margin-right:auto;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #ffeb9a; border-radius:5px; background:#f7fbc4; text-align:center; color:#5c6b2e; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 秋日时光<br/>愿这一季清欢，温柔了你的流年
</div>

<div style="margin:24px 0 4px; padding:16px; background:#f7fbc4; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#5c6b2e; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#8a9a3a; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
  {
    id: 'seriesreport',
    name: '系列报道',
    industries: ['媒体', '政务'],
    shell: (t) => {
      const head = `
<div style="margin:0 0 22px; padding:6px 22px; background:#0867a6; border-radius:20px; text-align:center; color:#ffffff; font-size:15px; line-height:1.6; letter-spacing:1.5px;">
  <span style="font-weight:700;">点击蓝字</span>，立即关注
</div>`
      const foot = `
<div style="margin:32px 0 16px; text-align:center; font-size:16px; font-weight:700; letter-spacing:4px; color:#0867a6; border:1px solid #0867a6; border-radius:20px; padding:4px 0; max-width:38%; margin-left:auto; margin-right:auto;">END</div>
<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #d4e5ff; border-radius:5px; background:#f4f8ff; text-align:center; color:#296cd4; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 系列报道<br/>愿每一次记录，都被时代温柔收藏
</div>
<div style="margin:24px 0 4px; padding:16px; background:#f4f8ff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#0867a6; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#5a93c7; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>`
      return { head, foot }
    },
    scaffold: (t) => {
      const heroImg =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0867a6"/><stop offset="1" stop-color="#d4e5ff"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#ffffff" text-anchor="middle">系列报道</text><text x="50%" y="72%" font-family="sans-serif" font-size="13" fill="#eaf2fb" text-anchor="middle">Replace with your photo</text></svg>',
        )
      return `
<div style="margin:0 0 22px; padding:6px 22px; background:#0867a6; border-radius:20px; text-align:center; color:#ffffff; font-size:15px; line-height:1.6; letter-spacing:1.5px;">
  <span style="font-weight:700;">点击蓝字</span>，立即关注
</div>

<h1>${t}</h1>

<p>一篇有温度的系列报道，始于一个值得被看见的现场。我们用脚步丈量，用笔尖记录，让平凡的故事拥有被倾听的机会。</p>

<h2>背景介绍</h2>

<p>事件的起点，往往藏在容易被忽略的细节里。厘清来龙去脉，是报道最朴素也最重要的起点。</p>

<h2>走进现场</h2>

<p>镜头之外，是真实的生活褶皱。我们蹲守、走访、求证，只为还原一个不被滤镜修饰的现场。</p>

<div style="margin:18px 0 22px; padding:8px; background:#f4f8ff; border:2px solid #d4e5ff; border-radius:16px;">
  <img src="${heroImg}" alt="系列报道配图" style="width:100%; border-radius:12px; display:block;" />
</div>

<h2>展望发展</h2>

<p>记录不是终点，而是改变的开始。当更多目光汇聚，那些被忽略的角落，终将被光照亮。</p>

<blockquote><p>好的报道，是时代的注脚；而每一次真诚的书写，都在为未来保留一份证据。</p></blockquote>

<div style="margin:32px 0 16px; text-align:center; font-size:16px; font-weight:700; letter-spacing:4px; color:#0867a6; border:1px solid #0867a6; border-radius:20px; padding:4px 0; max-width:38%; margin-left:auto; margin-right:auto;">END</div>

<div style="margin:14px auto 22px; max-width:84%; padding:14px 16px; border:2px solid #d4e5ff; border-radius:5px; background:#f4f8ff; text-align:center; color:#296cd4; font-size:15px; line-height:1.8;">
  感谢你读到这里 · 系列报道<br/>愿每一次记录，都被时代温柔收藏
</div>

<div style="margin:24px 0 4px; padding:16px; background:#f4f8ff; border-radius:14px; display:flex; align-items:center; gap:16px;">
  <img src="${QR_CODE_BASE64}" alt="公众号二维码" style="width:84px; height:84px; border-radius:8px; display:block; flex:0 0 84px; object-fit:cover;" />
  <div style="flex:1;">
    <div style="font-size:16px; font-weight:700; color:#0867a6; margin-bottom:4px;">${t}</div>
    <div style="font-size:13px; color:#5a93c7; line-height:1.6;">长按识别二维码 关注我们<br/>微信号：ranbo4615</div>
  </div>
</div>
`
    },
  },
]

export interface TemplateDef {
  id: string
  /** 风格 id（对应 themes.ts） */
  styleId: string
  /** 用途 id（对应 USAGES） */
  usageId: string
  /** 行业标签（用于行业维度筛选） */
  industries: string[]
}

// 精选模板组合（覆盖多维交叉）。可继续在此扩展。
export const TEMPLATES: TemplateDef[] = [
  { id: 't01', styleId: 'minimal', usageId: 'meeting', industries: ['政务', '教育'] },
  { id: 't02', styleId: 'business', usageId: 'meeting', industries: ['教育'] },
  { id: 't03', styleId: 'fresh', usageId: 'activity', industries: ['教育', '旅游'] },
  { id: 't04', styleId: 'cartoon', usageId: 'activity', industries: ['旅游', '教育'] },
  { id: 't05', styleId: 'literary', usageId: 'person', industries: ['媒体', '教育'] },
  { id: 't06', styleId: 'fashion', usageId: 'product', industries: ['电商', '科技'] },
  { id: 't07', styleId: 'dynamic', usageId: 'news', industries: ['媒体', '科技'] },
  { id: 't08', styleId: 'china', usageId: 'commend', industries: ['政务', '教育'] },
  { id: 't09', styleId: 'clean', usageId: 'report', industries: ['商务', '科技'] },
  { id: 't10', styleId: 'ins', usageId: 'science', industries: ['教育', '医疗'] },
  { id: 't11', styleId: 'minimal', usageId: 'recruit', industries: ['科技', '金融'] },
  { id: 't12', styleId: 'business', usageId: 'recruit', industries: ['金融', '电商'] },
  { id: 't13', styleId: 'fresh', usageId: 'science', industries: ['医疗', '教育'] },
  { id: 't14', styleId: 'cartoon', usageId: 'science', industries: ['教育'] },
  { id: 't15', styleId: 'literary', usageId: 'news', industries: ['媒体'] },
  { id: 't16', styleId: 'fashion', usageId: 'person', industries: ['媒体'] },
  { id: 't17', styleId: 'dynamic', usageId: 'activity', industries: ['旅游', '媒体'] },
  { id: 't18', styleId: 'china', usageId: 'meeting', industries: ['政务'] },
  { id: 't19', styleId: 'clean', usageId: 'product', industries: ['电商'] },
  { id: 't20', styleId: 'ins', usageId: 'activity', industries: ['旅游'] },
  { id: 't21', styleId: 'minimal', usageId: 'report', industries: ['科技'] },
  { id: 't22', styleId: 'business', usageId: 'report', industries: ['政务'] },
  { id: 't23', styleId: 'fresh', usageId: 'person', industries: ['教育'] },
  { id: 't24', styleId: 'cartoon', usageId: 'product', industries: ['电商'] },
  { id: 't25', styleId: 'literary', usageId: 'commend', industries: ['教育'] },
  { id: 't26', styleId: 'fashion', usageId: 'meeting', industries: [] },
  { id: 't27', styleId: 'solar', usageId: 'solar', industries: ['媒体', '旅游', '政务'] },
  { id: 't28', styleId: 'solar-summer', usageId: 'solarSummer', industries: ['媒体', '旅游', '政务'] },
  { id: 't29', styleId: 'summer-cool', usageId: 'summerRelief', industries: ['政务'] },
  { id: 't30', styleId: 'spring', usageId: 'springLate', industries: ['媒体', '旅游', '教育'] },
  { id: 't31', styleId: 'autumn', usageId: 'autumnCool', industries: ['媒体', '旅游', '教育'] },
  { id: 't32', styleId: 'campus', usageId: 'back2school', industries: ['教育'] },
  { id: 't33', styleId: 'freshblue', usageId: 'literaryfresh', industries: ['媒体'] },
  { id: 't34', styleId: 'winter', usageId: 'wintertravel', industries: ['旅游'] },
  { id: 't35', styleId: 'travel', usageId: 'travelnote', industries: ['旅游', '媒体'] },
  { id: 't36', styleId: 'cafe', usageId: 'cafetime', industries: ['餐饮', '生活'] },
  { id: 't37', styleId: 'solar-autumn', usageId: 'liqiu', industries: ['媒体', '生活'] },
  { id: 't38', styleId: 'reportblue', usageId: 'seriesreport', industries: ['媒体', '政务'] },
]

// 便捷查询
export function getUsage(id: string): UsageDef | undefined {
  return USAGES.find((u) => u.id === id)
}
