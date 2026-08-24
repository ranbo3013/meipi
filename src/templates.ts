// 美文π 模板库
// 对标键盘喵速排的分类：标题 / 分割线 / 正文 / 引导栏 / 布局。
// 每个模板基于当前主题 token 生成「完整内联样式」HTML：
//  - 插入编辑器即所见即所得（自带内联样式）
//  - 复制出去（经 sanitize）也干净、公众号兼容（render.ts 白名单已放开 border/margin/padding/table 等）

import type { Theme, StyleMap } from './themes'

/** 模板占位文字：插入后自动选中，便于用户直接打字替换 */
export const TITLE_PLACEHOLDER = '写入标题'

/** 从主题的分割线样式里提取边线颜色（公众号兼容的 hex/rgb） */
function borderColor(hr: StyleMap): string {
  const bt = hr['border-top'] || hr['border'] || ''
  const m = bt.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/i)
  return m ? m[0] : '#e0d8c8'
}

/** 主题强调色（用标题色，三套都协调） */
function accent(t: Theme): string {
  return t.h2.color
}
/** 正文文字色 */
function ink(t: Theme): string {
  return t.container.color
}
/** 中性浅底（不依赖主题，公众号安全） */
const SOFT = 'rgba(0,0,0,0.04)'
/** 中性灰字 */
const MUTED = '#9a9488'

/** 单图占位（灰色 SVG，复制进公众号也稳定显示，用户插入后替换真实图片地址即可） */
const IMG_PH =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='360'%3E%3Crect width='100%25' height='100%25' fill='%23e8e0d0'/%3E%3Ctext x='50%25' y='50%25' font-size='22' fill='%23999999' text-anchor='middle' dominant-baseline='middle'%3E点击替换图片%3C/text%3E%3C/svg%3E"

/** 二维码占位（模拟二维码方块图案，用户插入后替换为自己的二维码图片地址） */
const QR_PH =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23ffffff' stroke='%23dddddd'/%3E%3Crect x='24' y='24' width='48' height='48' fill='%23333333'/%3E%3Crect x='128' y='24' width='48' height='48' fill='%23333333'/%3E%3Crect x='24' y='128' width='48' height='48' fill='%23333333'/%3E%3Crect x='96' y='96' width='20' height='20' fill='%23333333'/%3E%3Ctext x='100' y='186' font-size='13' fill='%23999999' text-anchor='middle'%3E二维码占位%3C/text%3E%3C/svg%3E"

export interface TemplateItem {
  id: string
  name: string
  /** 基于当前主题生成完整内联样式 HTML 片段 */
  render: (theme: Theme) => string
}

export interface TemplateGroup {
  id: string
  name: string
  items: TemplateItem[]
}

/** 模板大类：把若干细分组归类管理（当前仅 基础排版；行业专题已迁移至一键排版） */
export interface TemplateCategory {
  id: string
  name: string
  groups: TemplateGroup[]
}

// ---------------- 标题 ----------------
const titleGroup: TemplateGroup = {
  id: 'title',
  name: '标题',
  items: [
    {
      id: 'basic',
      name: '基础标题',
      render: (t) => {
        const line = borderColor(t.hr)
        return `<h2 style="text-align:center;font-size:22px;font-weight:700;color:${accent(t)};margin:28px 0 14px;padding-bottom:12px;border-bottom:1px solid ${line};">${TITLE_PLACEHOLDER}</h2>`
      },
    },
    {
      id: 'boxed',
      name: '线框标题',
      render: (t) =>
        `<h2 style="text-align:center;font-size:20px;font-weight:700;color:${accent(t)};border:1px solid ${accent(t)};border-radius:8px;padding:10px 18px;margin:24px 0;">${TITLE_PLACEHOLDER}</h2>`,
    },
    {
      id: 'filled',
      name: '底色标题',
      render: (t) =>
        `<h2 style="text-align:center;font-size:20px;font-weight:700;color:#ffffff;background:${accent(t)};padding:12px 18px;border-radius:8px;margin:24px 0;letter-spacing:1px;">${TITLE_PLACEHOLDER}</h2>`,
    },
    {
      id: 'subtitle',
      name: '主副标题',
      render: (t) =>
        `<div style="text-align:center;margin:28px 0;"><div style="font-size:22px;font-weight:700;color:${ink(t)};letter-spacing:2px;">${TITLE_PLACEHOLDER}</div><div style="font-size:12px;color:${MUTED};letter-spacing:3px;margin-top:6px;text-transform:uppercase;">Subtitle</div></div>`,
    },
    {
      id: 'symbol',
      name: '符号标题',
      render: (t) =>
        `<h2 style="font-size:20px;font-weight:700;color:${ink(t)};margin:24px 0 12px;border-left:4px solid ${accent(t)};padding-left:12px;">${TITLE_PLACEHOLDER}</h2>`,
    },
  ],
}

// ---------------- 分割线 ----------------
const dividerGroup: TemplateGroup = {
  id: 'divider',
  name: '分割线',
  items: [
    {
      id: 'solid',
      name: '细线',
      render: (t) =>
        `<hr style="border:none;border-top:1px solid ${borderColor(t.hr)};margin:24px 0">`,
    },
    {
      id: 'dashed',
      name: '虚线',
      render: (t) =>
        `<hr style="border:none;border-top:1px dashed ${borderColor(t.hr)};margin:24px 0">`,
    },
    {
      id: 'dotted',
      name: '点线',
      render: (t) =>
        `<hr style="border:none;border-top:1px dotted ${borderColor(t.hr)};margin:24px 0">`,
    },
    {
      id: 'double',
      name: '双线',
      render: (t) =>
        `<hr style="border:none;border-top:3px double ${borderColor(t.hr)};margin:24px 0">`,
    },
    {
      id: 'triangle',
      name: '三角 ▼',
      render: (t) =>
        `<p style="text-align:center;color:${accent(t)};font-size:14px;margin:20px 0;letter-spacing:6px;">▼ ▼ ▼</p>`,
    },
    {
      id: 'diamond',
      name: '菱形 ◆',
      render: (t) =>
        `<p style="text-align:center;color:${MUTED};font-size:14px;margin:20px 0;letter-spacing:4px;">— ◆ —</p>`,
    },
  ],
}

// ---------------- 正文 ----------------
const bodyGroup: TemplateGroup = {
  id: 'body',
  name: '正文',
  items: [
    {
      id: 'quote-card',
      name: '引用卡片',
      render: (t) =>
        `<div style="margin:18px 0;padding:14px 16px;border-left:4px solid ${accent(t)};background:${SOFT};border-radius:0 8px 8px 0;color:${ink(t)};font-size:15px;line-height:1.8;">在这里引用一段话，或分享一句触动你的话。</div>`,
    },
    {
      id: 'hint',
      name: '提示块',
      render: (t) =>
        `<div style="margin:18px 0;padding:14px 16px;background:${SOFT};border:1px solid ${accent(t)};border-radius:8px;color:${ink(t)};font-size:15px;line-height:1.8;">提示：把这里换成你的重点说明或注意事项。</div>`,
    },
    {
      id: 'card',
      name: '简洁卡片',
      render: (t) =>
        `<div style="margin:18px 0;padding:16px;border:1px solid #e8e0d0;border-radius:10px;background:#ffffff;color:${ink(t)};font-size:15px;line-height:1.8;">卡片内容：可用于金句、要点总结，或一段补充说明。</div>`,
    },
    {
      id: 'callout',
      name: '重点强调',
      render: (t) =>
        `<div style="margin:18px 0;padding:14px 16px;background:${SOFT};border-radius:8px;color:${ink(t)};font-size:15px;line-height:1.8;"><strong style="color:${accent(t)};">重点</strong>：把关键段落放在这里，让读者一眼看到核心观点。</div>`,
    },
  ],
}

// ---------------- 引导栏 ----------------
const guideGroup: TemplateGroup = {
  id: 'guide',
  name: '引导栏',
  items: [
    {
      id: 'follow',
      name: '关注引导',
      render: (t) =>
        `<div style="margin:22px 0;text-align:center;padding:16px;background:${SOFT};border-radius:10px;"><div style="font-size:16px;font-weight:700;color:${accent(t)};">点击上方蓝字「关注」</div><div style="font-size:13px;color:${MUTED};margin-top:6px;">不错过每一篇治愈好文</div></div>`,
    },
    {
      id: 'like',
      name: '点赞在看',
      render: (t) =>
        `<div style="margin:20px 0;text-align:center;color:${ink(t)};font-size:14px;line-height:1.7;">如果喜欢这篇文章，欢迎 <span style="color:${accent(t)};font-weight:700;">点赞 · 在看</span>，你的支持是我持续更新的动力。</div>`,
    },
    {
      id: 'readmore',
      name: '阅读原文',
      render: (t) =>
        `<div style="margin:20px 0;text-align:center;"><span style="display:inline-block;padding:10px 24px;background:${accent(t)};color:#ffffff;border-radius:20px;font-size:14px;">阅读原文</span></div>`,
    },
    {
      id: 'triple',
      name: '引导三联',
      render: (t) =>
        `<table style="width:100%;border-collapse:collapse;margin:20px 0;"><tr><td style="text-align:center;padding:8px;"><span style="display:inline-block;padding:8px 14px;border:1px solid ${accent(t)};border-radius:8px;color:${accent(t)};font-size:13px;">关注</span></td><td style="text-align:center;padding:8px;"><span style="display:inline-block;padding:8px 14px;border:1px solid ${accent(t)};border-radius:8px;color:${accent(t)};font-size:13px;">点赞</span></td><td style="text-align:center;padding:8px;"><span style="display:inline-block;padding:8px 14px;border:1px solid ${accent(t)};border-radius:8px;color:${accent(t)};font-size:13px;">在看</span></td></tr></table>`,
    },
  ],
}

// ---------------- 布局 ----------------
const layoutGroup: TemplateGroup = {
  id: 'layout',
  name: '布局',
  items: [
    {
      id: 'two-col',
      name: '双栏',
      render: () =>
        `<table style="width:100%;border-collapse:collapse;margin:18px 0;"><tr><td style="width:50%;padding:10px;vertical-align:top;border:1px dashed #d8cfbf;">左栏内容</td><td style="width:50%;padding:10px;vertical-align:top;border:1px dashed #d8cfbf;">右栏内容</td></tr></table>`,
    },
    {
      id: 'three-col',
      name: '三栏',
      render: () =>
        `<table style="width:100%;border-collapse:collapse;margin:18px 0;"><tr><td style="width:33.33%;padding:8px;vertical-align:top;border:1px dashed #d8cfbf;">栏一</td><td style="width:33.33%;padding:8px;vertical-align:top;border:1px dashed #d8cfbf;">栏二</td><td style="width:33.33%;padding:8px;vertical-align:top;border:1px dashed #d8cfbf;">栏三</td></tr></table>`,
    },
    {
      id: 'timeline',
      name: '时间轴',
      render: (t) =>
        `<ul style="list-style:none;padding-left:16px;border-left:2px solid ${accent(t)};margin:18px 0;"><li style="margin:0 0 12px;color:${ink(t)};font-size:15px;line-height:1.7;">▸ 阶段一：写下你的第一步计划。</li><li style="margin:0 0 12px;color:${ink(t)};font-size:15px;line-height:1.7;">▸ 阶段二：执行并复盘调整。</li><li style="margin:0;color:${ink(t)};font-size:15px;line-height:1.7;">▸ 阶段三：沉淀为可复用的方法。</li></ul>`,
    },
    {
      id: 'image-text',
      name: '左右图文',
      render: () =>
        `<table style="width:100%;border-collapse:collapse;margin:18px 0;"><tr><td style="width:38%;padding:8px;vertical-align:middle;"><div style="width:100%;height:90px;background:#e8e0d0;border-radius:8px;color:#999999;font-size:12px;text-align:center;line-height:90px;">图片占位</div></td><td style="width:62%;padding:8px;vertical-align:middle;color:#3a3a3a;font-size:15px;line-height:1.7;">右侧配一段说明文字，描述图片内容，或延伸你的观点。</td></tr></table>`,
    },
  ],
}

// ---------------- 单图 ----------------
const singleImageGroup: TemplateGroup = {
  id: 'single-image',
  name: '单图',
  items: [
    {
      id: 'plain',
      name: '基础单图',
      render: () =>
        `<figure style="margin:18px 0;text-align:center;"><img src="${IMG_PH}" alt="图片" style="max-width:100%;height:auto;display:inline-block;"/><figcaption style="margin-top:8px;font-size:13px;color:${MUTED};">图片说明文字</figcaption></figure>`,
    },
    {
      id: 'rounded',
      name: '圆角单图',
      render: () =>
        `<figure style="margin:18px 0;text-align:center;"><img src="${IMG_PH}" alt="图片" style="max-width:100%;height:auto;display:inline-block;border-radius:12px;"/></figure>`,
    },
    {
      id: 'shadow',
      name: '阴影单图',
      render: () =>
        `<figure style="margin:18px 0;text-align:center;"><img src="${IMG_PH}" alt="图片" style="max-width:100%;height:auto;display:inline-block;box-shadow:0 6px 18px rgba(0,0,0,0.12);border-radius:8px;"/></figure>`,
    },
    {
      id: 'frame',
      name: '边框单图',
      render: (t) =>
        `<figure style="margin:18px 0;text-align:center;"><img src="${IMG_PH}" alt="图片" style="max-width:100%;height:auto;display:inline-block;border:6px solid #fff;box-shadow:0 0 0 1px ${accent(t)};border-radius:6px;"/></figure>`,
    },
  ],
}


// ---------------- END ----------------
const endGroup: TemplateGroup = {
  id: 'end',
  name: 'END',
  items: [
    {
      id: 'line',
      name: '细线 END',
      render: () =>
        `<p style="text-align:center;color:${MUTED};font-size:14px;letter-spacing:4px;margin:26px 0;">————— END —————</p>`,
    },
    {
      id: 'dot',
      name: '圆点 END',
      render: () =>
        `<p style="text-align:center;color:${MUTED};font-size:14px;margin:26px 0;">· · · END · · ·</p>`,
    },
    {
      id: 'icon',
      name: '菱形 END',
      render: (t) =>
        `<p style="text-align:center;color:${accent(t)};font-size:14px;letter-spacing:6px;margin:26px 0;">◇ &nbsp;END&nbsp; ◇</p>`,
    },
  ],
}

// ---------------- 底部签名 ----------------
const signatureGroup: TemplateGroup = {
  id: 'signature',
  name: '底部签名',
  items: [
    {
      id: 'qr',
      name: '二维码署名',
      render: (t) =>
        `<section style="margin:26px 0;padding:18px;border-top:1px solid ${borderColor(t.hr)};display:flex;align-items:center;gap:16px;"><div style="flex:1;"><div style="font-size:16px;font-weight:700;color:${ink(t)};">公众号名称</div><div style="font-size:13px;color:${MUTED};margin-top:6px;line-height:1.6;">这里写一句你的 slogan 或简介。<br/>长按识别二维码，关注更多好文。</div></div><img src="${QR_PH}" alt="二维码" style="width:88px;height:88px;flex:0 0 88px;border:1px solid #eee;"/></section>`,
    },
    {
      id: 'centered',
      name: '居中署名',
      render: (t) =>
        `<section style="margin:26px 0;text-align:center;padding-top:16px;border-top:1px solid ${borderColor(t.hr)};"><div style="font-size:15px;font-weight:700;color:${ink(t)};">公众号名称</div><div style="font-size:12px;color:${MUTED};margin-top:6px;">作者署名 · 写于某年某月</div></section>`,
    },
    {
      id: 'card',
      name: '名片署名',
      render: (t) =>
        `<section style="margin:26px 0;background:${SOFT};border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px;"><img src="${QR_PH}" alt="二维码" style="width:76px;height:76px;flex:0 0 76px;background:#fff;border-radius:8px;"/><div style="flex:1;"><div style="font-size:15px;font-weight:700;color:${ink(t)};">公众号名称</div><div style="font-size:12px;color:${MUTED};margin-top:4px;line-height:1.6;">长按识别二维码关注<br/>作者：你的名字</div></div></section>`,
    },
  ],
}

// ---------------- 大类归类 ----------------
// 模板库只保留「基础排版」；行业专题（智慧教育等）已迁移至一键排版（教育行业），
// 不再出现在左侧模板库。
const basicGroups: TemplateGroup[] = [
  titleGroup,
  dividerGroup,
  bodyGroup,
  guideGroup,
  layoutGroup,
  singleImageGroup,
  endGroup,
  signatureGroup,
]

const _templateCategories: TemplateCategory[] = [
  { id: 'basic', name: '基础排版', groups: basicGroups },
]


/**
 * 给每个模板的 HTML 最外层注入 data-meipi-tpl 标记，
 * 用于编辑器识别模板组件、支持删除/替换等操作。
 */
function _wrapTemplatesWithTplMarker(
  groups: TemplateGroup[]
): TemplateGroup[] {
  return groups.map((g) => ({
    ...g,
    items: g.items.map((it) => ({
      ...it,
      render: (theme: Theme) => {
        const html = it.render(theme)
        // 在第一个标签的 > 之前插入 data-meipi-tpl
        return html.replace(
          /^(<[a-zA-Z][a-zA-Z0-9-]*)/,
          `$1 data-meipi-tpl="${g.id}:${it.id}"`
        )
      },
    })),
  }))
}

/** 把分类结构递归套上 tpl 标记，得到最终分级数据 */
function _buildCategories(cats: TemplateCategory[]): TemplateCategory[] {
  return cats.map((c) => ({
    ...c,
    groups: _wrapTemplatesWithTplMarker(c.groups),
  }))
}

export const templateCategories: TemplateCategory[] = _buildCategories(_templateCategories)

/** 兼容导出：扁平的所有组（含已套标记），供旧引用方使用 */
export const templateGroups: TemplateGroup[] = templateCategories.flatMap((c) => c.groups)
