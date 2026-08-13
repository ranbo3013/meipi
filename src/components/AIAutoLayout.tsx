import { useEffect, useState } from 'react'
import { aiLayout, loadAISettings } from '../aiLayout'

interface AIAutoLayoutProps {
  open: boolean
  onClose: () => void
  /** 把排版结果（语义 HTML）灌回编辑器 */
  onApply: (html: string) => void
  /** 当前编辑器已有内容，作为「仅改良排版」的输入预填 */
  currentText: string
}

export function AIAutoLayout({
  open,
  onClose,
  onApply,
  currentText,
}: AIAutoLayoutProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 打开时预填当前编辑器内容（方便「改良现有排版」）
  useEffect(() => {
    if (open) {
      setText(currentText || '')
      setError('')
      setSuccess('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleRun = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    // 设置已统一收纳到左侧「设置」菜单，这里实时读取最新配置
    const res = await aiLayout(loadAISettings(), text)
    setLoading(false)
    if (!res.ok) {
      setError(res.error || '排版失败')
      return
    }
    onApply(res.html || '')
    setSuccess('已排版，已填入编辑器右侧即时预览，可继续微调～')
    setTimeout(() => onClose(), 900)
  }

  return (
    <div className="ai-modal-mask" onMouseDown={onClose}>
      <div className="ai-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ai-modal-head">
          <span className="ai-modal-title">AI 自动排版</span>
          <button className="ai-modal-close" onClick={onClose} title="关闭">
            ×
          </button>
        </div>

        <div className="ai-body">
          <p className="ai-hint">
            把草稿文字粘贴到下面（纯文字、Markdown 都行）。AI 会读懂结构，
            自动加标题 / 分段 / 引用 / 列表，并套用你当前选择的主题样式。
            <br />
            模型与密钥请在左侧「设置 → AI 接入」中配置。
          </p>
          <textarea
            className="ai-textarea"
            placeholder="在此粘贴要排版的文字…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <div className="ai-msg ai-err">{error}</div>}
          {success && <div className="ai-msg ai-ok">{success}</div>}
          <div className="ai-actions">
            <button className="ai-run" onClick={handleRun} disabled={loading}>
              {loading ? '排版中…' : '一键 AI 排版'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
