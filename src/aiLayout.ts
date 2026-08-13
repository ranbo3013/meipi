// AI 自动排版核心模块
// 设计：大模型只负责「读懂内容结构 → 输出语义 HTML（不带任何内联样式/class）」，
// 拿回来后走现有的 sanitize + 套主题流水线，样式仍由用户所选主题统一把控。
// 密钥仅存 localStorage，直连大模型厂商，不经过任何我们自己的服务器。

export interface AIProvider {
  id: string
  name: string
  baseURL: string
  model: string
  note?: string
}

// 预设厂商（均兼容 OpenAI Chat Completions 协议）。baseURL 可在 UI 覆盖，
// 以应对部分厂商浏览器 CORS 限制（填一个本地代理/转发地址即可）。
export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    note: '性价比高，注册即送额度，浏览器可直连',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    note: '阿里云 DashScope，兼容模式；若浏览器跨域报错需走代理',
  },
]

export interface AISettings {
  providerId: string
  baseURL: string
  model: string
  apiKey: string
}

const SETTINGS_KEY = 'meipi:ai'

export function loadAISettings(): AISettings {
  const fallback = AI_PROVIDERS[0]
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AISettings>
      // baseURL/model 以保存的为准，但若为空则回退到厂商默认
      const prov =
        AI_PROVIDERS.find((p) => p.id === parsed.providerId) ?? fallback
      return {
        providerId: prov.id,
        baseURL: parsed.baseURL || prov.baseURL,
        model: parsed.model || prov.model,
        apiKey: parsed.apiKey || '',
      }
    }
  } catch {
    /* 忽略 */
  }
  return {
    providerId: fallback.id,
    baseURL: fallback.baseURL,
    model: fallback.model,
    apiKey: '',
  }
}

export function saveAISettings(s: AISettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

// 系统提示词：约束模型只输出「语义结构 HTML」，不写样式、不包容器、不增删原文。
const SYSTEM_PROMPT = `你是一个微信公众号排版助手。用户会给你一段未经排版的文章文字（可能是纯文字、带 Markdown 语法、或随意分段）。请把它转成结构清晰、适合公众号阅读的语义 HTML，并只输出 HTML 本身——不要包含任何解释文字，也不要用 \`\`\` 代码块包裹。

规则：
- 仅使用以下标签：h1（文章主标题，最多一个，放开头）、h2（小节标题）、h3（更小标题）、p（正文段落）、blockquote（金句/引用）、ul/ol/li（列表）、hr（分割线）、strong（重点加粗）、em（强调）、a（链接，保留 href）、img（仅当原文明确给出图片链接时才用）。
- 不要写任何 style 属性或 class，也不要出现 <html>/<body>/<section> 等容器标签。样式会由主题统一处理。
- 合理分段：每段一个 <p>；把明显的标题（如「一、xxx」「第一章」「小标题」）识别成 h2；名言金句放进 blockquote。
- 严格保留原文意思与措辞，不要增删或改写内容。
- 如果原文没有标题，请用一句话概括文章主旨，生成一个 h1 放在最前面（直接作为标题，不要加「导读」等字眼）。
- 输出纯 HTML 字符串，标签之间用换行分隔即可。`

// 去掉模型可能多包的代码围栏（```html ... ```）
function unwrapFences(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```\s*$/i, '')
  }
  return t.trim()
}

export interface LayoutResult {
  ok: boolean
  html?: string
  error?: string
}

// 把 HTTP 状态码翻译成对运营/非技术用户友好的中文提示
const STATUS_HINTS: Record<number, string> = {
  400: '请求参数有误',
  401: 'API Key 无效或未授权，请检查设置里的 Key',
  402: '账户余额不足，请到对应模型厂商控制台充值后重试',
  403: '无权限访问该模型',
  404: '接口地址不正确，请检查设置里的「接口地址」',
  429: '请求过于频繁，请稍后重试',
  500: '模型服务内部错误，请稍后重试',
  502: '模型服务网关错误，请稍后重试',
  503: '模型服务暂时不可用，请稍后重试',
}

function statusHint(status: number): string {
  return STATUS_HINTS[status] ?? `服务返回 ${status}`
}

/**
 * 调用大模型，把草稿文字排版成语义 HTML。
 * @param settings 厂商/密钥配置
 * @param text 用户草稿
 */
export async function aiLayout(
  settings: AISettings,
  text: string,
): Promise<LayoutResult> {
  if (!settings.apiKey) {
    return { ok: false, error: '请先填写 API Key（在「AI 自动排版」弹窗的设置里）' }
  }
  if (!text.trim()) {
    return { ok: false, error: '请先粘贴要排版的文字' }
  }
  const url = `${settings.baseURL.replace(/\/$/, '')}/chat/completions`
  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
    })
  } catch (e) {
    return {
      ok: false,
      error:
        '网络请求失败：' +
        (e instanceof Error ? e.message : String(e)) +
        '。若提示 CORS/跨域，请在设置里把「接口地址」换成可访问的代理或转发地址。',
    }
  }
  if (!resp.ok) {
    let detail = ''
    try {
      const j = await resp.json()
      detail = j?.error?.message || JSON.stringify(j)
    } catch {
      detail = await resp.text().catch(() => '')
    }
    return {
      ok: false,
      error: `接口返回 ${resp.status}（${statusHint(resp.status)}）${detail ? '：' + detail : ''}`,
    }
  }
  let data: any
  try {
    data = await resp.json()
  } catch (e) {
    return { ok: false, error: '返回结果解析失败：' + (e as Error).message }
  }
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (!content || !content.trim()) {
    return { ok: false, error: '模型未返回可用内容，请重试。' }
  }
  return { ok: true, html: unwrapFences(content) }
}
