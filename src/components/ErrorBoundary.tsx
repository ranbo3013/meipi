import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 错误边界：捕获子树渲染期异常，避免整页白屏，
 * 并直接在页面上展示具体错误信息，便于定位。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[美文π] 捕获到渲染错误：', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '32px',
            fontFamily: 'system-ui, sans-serif',
            color: '#b42318',
            maxWidth: 880,
            margin: '0 auto',
          }}
        >
          <h2 style={{ marginBottom: 12 }}>页面渲染出错了</h2>
          <p style={{ color: '#475467', fontSize: 14 }}>
            把下面的错误信息发给我（截图或复制文字），我就能精确定位修复。
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#fff5f5',
              border: '1px solid #ffd7d7',
              borderRadius: 8,
              padding: 16,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#7a271a',
            }}
          >
            {String(this.state.error.message)}
            {'\n\n'}
            {String(this.state.error.stack)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              border: '1px solid #d0d5dd',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
