import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'

interface SafeMarkdownProps {
  children: string
}

export function SafeMarkdown({ children }: SafeMarkdownProps) {
  return (
    <ReactMarkdown
      allowedElements={['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4', 'a']}
      components={{
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
