// 热点话题模块：只展示真实热榜，不依赖 AI / API Key
// 数据源：uapis.cn 免费热榜聚合接口
//   接口：https://uapis.cn/api/v1/misc/hotboard?type=baidu|weibo|zhihu|toutiao
//   返回：{ type, update_time, list: [{ index, title, url, hot_value, extra }] }
// 因为 uapis 没有 CORS 头，浏览器不能直连；这里请求同源的 /api/hotboard，
//   由 Vite 的 dev/preview 代理（见 vite.config.ts）在服务端转发，绕开跨域限制。

export interface HotSource {
  id: string
  name: string
  /** uapis hotboard 的 type 参数 */
  type: string
}

export const HOT_SOURCES: HotSource[] = [
  { id: 'baidu', name: '百度热搜', type: 'baidu' },
  { id: 'weibo', name: '微博热搜', type: 'weibo' },
  { id: 'zhihu', name: '知乎热榜', type: 'zhihu' },
  { id: 'toutiao', name: '实时热点', type: 'toutiao' },
]

export interface HotItem {
  title: string
  /** 热度文本，如 "7904630" 或 "1321 万热度"；部分为空的源显示 "-" */
  hot?: string
  /** 详情链接 */
  url?: string
}

export interface HotFetchResult {
  ok: boolean
  items: HotItem[]
  sourceName?: string
  error?: string
}

/**
 * 获取指定平台的真实热榜（经 Vite 代理，绕开 CORS）
 * @param sourceId HOT_SOURCES 中的 id，默认取第一个（百度热搜）
 */
export async function fetchHotTopics(sourceId?: string): Promise<HotFetchResult> {
  const source = HOT_SOURCES.find((s) => s.id === sourceId) ?? HOT_SOURCES[0]
  const url = `/api/hotboard?type=${source.type}`
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!resp.ok) {
      return { ok: false, items: [], error: `${source.name} 接口返回 ${resp.status}，请稍后重试` }
    }
    const json = await resp.json()
    const list: any[] = Array.isArray(json?.list) ? json.list : []
    const items: HotItem[] = list
      .slice(0, 50)
      .map((it) => ({
        title: it?.title ?? it?.word ?? it?.name ?? (typeof it === 'string' ? it : ''),
        hot: it?.hot_value ?? it?.hot ?? it?.heat ?? '',
        url: it?.url ?? '',
      }))
      .filter((it) => it.title)
    if (!items.length) {
      return { ok: false, items: [], error: `${source.name} 暂无数据，点击「刷新」重试` }
    }
    return { ok: true, items, sourceName: source.name }
  } catch (e) {
    return {
      ok: false,
      items: [],
      error:
        `${source.name} 获取失败：` +
        (e instanceof Error ? e.message : String(e)) +
        '。请确认通过 npm run dev 或 npm run preview 启动（已内置热榜代理）；直接打开打包后的静态文件无法获取热榜。',
    }
  }
}
