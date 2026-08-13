interface PreviewProps {
  html: string
}

export function Preview({ html }: PreviewProps) {
  return (
    <div className="preview-pane">
      <div
        className="article-card"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
