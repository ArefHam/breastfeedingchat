import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SafeMarkdownProps {
  children: string
}

// Elements the assistant may use. Anything else (raw HTML, images, …) is
// unwrapped: its text is kept, only the element itself is dropped.
const allowedElements = [
  'p', 'br', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'hr', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

export function SafeMarkdown({ children }: SafeMarkdownProps) {
  return (
    <ReactMarkdown
      allowedElements={allowedElements}
      unwrapDisallowed
      remarkPlugins={[remarkGfm]}
      components={{
        // Chat bubbles are small: render every heading level at one modest size.
        h1: ({ children: c }) => <h3>{c}</h3>,
        h2: ({ children: c }) => <h3>{c}</h3>,
        h5: ({ children: c }) => <h4>{c}</h4>,
        h6: ({ children: c }) => <h4>{c}</h4>,
        table: ({ children: c }) => <div className="table-scroll"><table>{c}</table></div>,
        a: ({ children: linkChildren, href }) => (
          <a href={href} rel="noreferrer noopener" target="_blank">{linkChildren}</a>
        ),
      }}
      skipHtml
      urlTransform={(url) => {
        try {
          const parsed = new URL(url)
          return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? defaultUrlTransform(url) : ''
        } catch {
          return ''
        }
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
