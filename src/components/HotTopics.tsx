import { useEffect, useMemo, useState } from 'react'
import { fetchHotTopics, HOT_SOURCES, type HotItem } from '../hotTopics'

interface HotTopicsProps {
  /** 是否撑满为独立模块（热点头条模块下为 true） */
  full?: boolean
}

const PAGE_SIZE = 15

// 复制文本到剪贴板，优先用异步 Clipboard API，失败时降级到 execCommand
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 降级 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

const CopyIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export function HotTopics({ full = false }: HotTopicsProps) {
  const [sourceId, setSourceId] = useState<string>(HOT_SOURCES[0].id)
  const [items, setItems] = useState<HotItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [page, setPage] = useState(1)
  const [copiedRank, setCopiedRank] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const source = HOT_SOURCES.find((s) => s.id === sourceId) ?? HOT_SOURCES[0]

  const load = async (id: string) => {
    setLoading(true)
    setErr('')
    setPage(1)
    // 注意：不在这里清空 query —— 搜索框在 4 个模块间共享，
    // 切换模块时保留搜索词，让一次输入对所有模块都生效
    const r = await fetchHotTopics(id)
    setLoading(false)
    if (r.ok) {
      setItems(r.items)
    } else {
      setItems([])
      setErr(r.error || '获取失败')
    }
  }

  useEffect(() => {
    load(sourceId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId])

  // 关键词搜索（前端对已加载列表过滤，大小写不敏感）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => (it.title || '').toLowerCase().includes(q))
  }, [items, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleCopy = async (title: string, rank: number) => {
    const ok = await copyText(title)
    if (ok) {
      setCopiedRank(rank)
      window.setTimeout(() => setCopiedRank((cur) => (cur === rank ? null : cur)), 1800)
    }
  }

  return (
    <section className={`hot-module ${full ? 'hot-module-full' : ''}`}>
      <nav className="hot-source-nav">
        {HOT_SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={sourceId === s.id ? 'active' : ''}
            onClick={() => setSourceId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </nav>

      <div className="hot-table-area">
        <div className="hot-table-head">
          <h3 className="hot-table-title">{source.name}</h3>
          <div className="hot-head-tools">
            <div className="hot-search">
              <SearchIcon />
              <input
                className="hot-search-input"
                type="search"
                value={query}
                placeholder="搜索关键词"
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
              />
              {query && (
                <button
                  type="button"
                  className="hot-search-clear"
                  onClick={() => {
                    setQuery('')
                    setPage(1)
                  }}
                  aria-label="清空搜索"
                  title="清空搜索"
                >
                  ×
                </button>
              )}
            </div>
            <button
              type="button"
              className="hot-refresh"
              onClick={() => load(sourceId)}
              disabled={loading}
            >
              {loading ? '刷新中…' : '↻ 刷新'}
            </button>
          </div>
        </div>

        {err && <div className="hot-err">{err}</div>}

        <div className="hot-table-wrap">
          <table className="hot-table">
            <thead>
              <tr>
                <th className="col-rank">排名</th>
                <th className="col-title">关键词</th>
                <th className="col-heat">搜索指数</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((it, i) => {
                const rank = (page - 1) * PAGE_SIZE + i + 1
                const top3 = rank <= 3
                const copied = copiedRank === rank
                return (
                  <tr key={rank + '-' + it.title}>
                    <td className="col-rank">
                      <span className={`hot-rank-badge ${top3 ? 'top' : ''}`}>{rank}</span>
                    </td>
                    <td className="col-title">
                      {it.url ? (
                        <a
                          className="hot-title"
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="点击查看详情"
                        >
                          {it.title}
                        </a>
                      ) : (
                        <span className="hot-title">{it.title}</span>
                      )}
                      <button
                        type="button"
                        className={`hot-copy ${copied ? 'copied' : ''}`}
                        onClick={() => handleCopy(it.title, rank)}
                        title={copied ? '已复制' : '复制关键词'}
                        aria-label="复制关键词"
                      >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </td>
                    <td className="col-heat">{it.hot || '-'}</td>
                  </tr>
                )
              })}
              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={3} className="hot-empty-cell">
                    {query.trim()
                      ? `未找到与「${query.trim()}」匹配的关键词`
                      : '暂无数据，点击右上角「刷新」重试'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <div className="hot-loading">加载中…</div>}
        </div>

        {totalPages > 1 && (
          <div className="hot-pager">
            <button
              type="button"
              className="hot-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`hot-page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="hot-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
