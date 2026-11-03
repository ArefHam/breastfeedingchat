import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Baby, Check, Copy, Heart, SendHorizontal } from 'lucide-react'
import { direction, t } from '../i18n'
import { messageSchema } from '../lib/validation'
import type { ChatMessage, Language } from '../types'
import { SafeMarkdown } from './SafeMarkdown'

interface ChatViewProps {
  language: Language
  messages: ChatMessage[]
  optimisticMessage: string | null
  sending: boolean
  onSend: (message: string) => Promise<void>
  onRetry: (message: ChatMessage) => Promise<void>
}

// The server treats a pending request older than this as abandoned and accepts a retry.
const STALE_PENDING_MS = 90_000
const SLOW_RESPONSE_MS = 20_000

function CopyButton({ language, text }: { language: Language; text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be unavailable (insecure context, permissions); nothing useful to show.
    }
  }

  return (
    <button className="copy-button" type="button" onClick={() => void copy()} aria-label={t(language, 'copy')}>
      {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
      <span>{copied ? t(language, 'copied') : t(language, 'copy')}</span>
    </button>
  )
}

// Mounted only while sending, so its timer starts fresh for every message.
function TypingRow({ language }: { language: Language }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_RESPONSE_MS)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className="typing-row" role="status">
      <Baby aria-hidden="true" size={18} />
      <span>{slow ? t(language, 'slowResponse') : t(language, 'sending')}</span>
      <i /><i /><i />
    </div>
  )
}

export function ChatView({ language, messages, optimisticMessage, sending, onSend, onRetry }: ChatViewProps) {
  const [draft, setDraft] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const quickQuestions = [t(language, 'q1'), t(language, 'q2'), t(language, 'q3')]
  const hasPending = messages.some((message) => message.role === 'user' && message.status === 'pending')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, optimisticMessage, sending])

  // Re-render while something is pending so a stuck answer eventually offers a retry.
  useEffect(() => {
    if (!hasPending) return
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [hasPending])

  // Grow the composer with its content (CSS caps the height).
  useLayoutEffect(() => {
    const element = inputRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [draft])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = messageSchema.safeParse(draft)
    if (!parsed.success || sending) return
    setDraft('')
    await onSend(parsed.data)
    inputRef.current?.focus()
  }

  async function sendQuick(question: string) {
    if (sending) return
    setDraft('')
    await onSend(question)
  }

  const hasMessages = messages.length > 0 || Boolean(optimisticMessage)

  return (
    <section className="chat-workspace" aria-label={t(language, 'appName')}>
      <div className="message-scroll" aria-live="polite">
        {!hasMessages && (
          <div className="chat-empty-state">
            <div className="empty-symbol" aria-hidden="true"><Heart size={31} /></div>
            <h2>{t(language, 'welcomeTitle')}</h2>
            <p>{t(language, 'welcomeBody')}</p>
            <div className="quick-question-list">
              {quickQuestions.map((question) => (
                <button type="button" key={question} onClick={() => void sendQuick(question)}>{question}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const pending = message.role === 'user' && message.status === 'pending'
          const stale = pending && now - new Date(message.created_at).getTime() > STALE_PENDING_MS
          return (
            <article className={`message-bubble ${message.role}`} dir="auto" key={message.id}>
              <div className="message-avatar" aria-hidden="true">
                {message.role === 'assistant' ? <Baby size={18} /> : <span>{language === 'fa' ? 'ش' : 'Y'}</span>}
              </div>
              <div className="message-content">
                {message.role === 'assistant' ? <SafeMarkdown>{message.content}</SafeMarkdown> : <p>{message.content}</p>}
                {message.role === 'assistant' && message.status === 'completed' && (
                  <div className="message-tools" dir={direction(language)}>
                    <CopyButton language={language} text={message.content} />
                  </div>
                )}
                {pending && !sending && !stale && (
                  <div className="message-pending" dir={direction(language)}>
                    <small>{t(language, 'awaitingAnswer')}</small>
                  </div>
                )}
                {(message.status === 'failed' || stale) && (
                  <div className="message-failed" dir={direction(language)}>
                    <small>{t(language, 'sendError')}</small>
                    <button disabled={sending} type="button" onClick={() => void onRetry(message)}>{t(language, 'retry')}</button>
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {optimisticMessage && (
          <article className="message-bubble user" dir="auto">
            <div className="message-avatar" aria-hidden="true"><span>{language === 'fa' ? 'ش' : 'Y'}</span></div>
            <div className="message-content"><p>{optimisticMessage}</p></div>
          </article>
        )}

        {sending && <TypingRow language={language} />}
        <div ref={endRef} />
      </div>

      <div className="composer-wrap">
        <form className="composer" onSubmit={submit}>
          <textarea
            aria-label={t(language, 'placeholder')}
            dir={draft ? 'auto' : direction(language)}
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={t(language, 'placeholder')}
            ref={inputRef}
            rows={1}
            value={draft}
          />
          <button className="send-button" disabled={sending || !messageSchema.safeParse(draft).success} type="submit" aria-label={t(language, 'send')}>
            <SendHorizontal aria-hidden="true" size={21} style={{ transform: direction(language) === 'rtl' ? 'scaleX(-1)' : undefined }} />
          </button>
        </form>
        <p className="care-note">{t(language, 'privacyNote')}</p>
      </div>
    </section>
  )
}
