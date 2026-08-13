import { useState } from 'react'
import { wechatifyHtml } from '../render'

interface CopyButtonProps {
  html: string
}

export function CopyButton({ html }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  // 复制富文本 HTML：必须以 text/html MIME 写入剪贴板，公众号后台才能识别成带内联样式的富文本。
  // 注意：navigator.clipboard.writeText() 会把字符串当纯文本写，粘贴后丢失全部样式 —— 绝不能用。
  // 复制前先做「公众号兼容化」（flex→table、去 absolute/transform），避免粘贴后变形。
  const copy = async () => {
    const out = wechatifyHtml(html)
    let ok = false

    // 主路径：现代 Clipboard API 写 text/html（公众号跨应用粘贴最可靠），附 text/plain 兜底。
    try {
      if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({
          'text/html': new Blob([out], { type: 'text/html' }),
          'text/plain': new Blob([out.replace(/<[^>]+>/g, '')], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
        ok = true
      }
    } catch {
      ok = false
    }

    // 备路径：execCommand('copy')。容器必须「可见」（opacity:1）且移出视口，
    // 否则部分浏览器会把选区当不可见而只复制纯文本，导致公众号粘贴后完全无样式。
    if (!ok) {
      try {
        const div = document.createElement('div')
        div.contentEditable = 'true'
        div.style.position = 'fixed'
        div.style.left = '0'
        div.style.top = '-10000px'
        div.style.width = '800px'
        div.style.opacity = '1'
        div.style.pointerEvents = 'none'
        div.innerHTML = out
        document.body.appendChild(div)
        const range = document.createRange()
        range.selectNodeContents(div)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        document.execCommand('copy')
        document.body.removeChild(div)
        ok = true
      } catch {
        ok = false
      }
    }

    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      window.alert('复制失败，请手动选中预览区内容后 Ctrl/⌘+C 复制。')
    }
  }

  return (
    <button
      className={'copy-btn' + (copied ? ' copied' : '')}
      onClick={copy}
      title="复制内联样式 HTML，直接粘贴到公众号后台"
    >
      {copied ? '✓ 已复制' : '一键复制'}
    </button>
  )
}
