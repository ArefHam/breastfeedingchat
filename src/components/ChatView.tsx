import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Baby, Heart, SendHorizontal } from 'lucide-react'
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

export function ChatView({ language, messages, optimisticMessage, sending, onSend, onRetry }: ChatViewProps) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const quickQuestions = [t(language, 'q1'), t(language, 'q2'), t(language, 'q3')]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, optimisticMessage, sending])

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

        {messages.map((message) => (
          <article className={`message-bubble ${message.role}`} dir="auto" key={message.id}>
            <div className="message-avatar" aria-hidden="true">
              {message.role === 'assistant' ? <Baby size={18} /> : <span>{language === 'fa' ? 'ش' : 'Y'}</span>}
            </div>
            <div className="message-content">
              {message.role === 'assistant' ? <SafeMarkdown>{message.content}</SafeMarkdown> : <p>{message.content}</p>}
              {message.status === 'failed' && (
                <div className="message-failed">
                  <small>{t(language, 'sendError')}</small>
                  <button disabled={sending} type="button" onClick={() => void onRetry(message)}>{t(language, 'retry')}</button>
                </div>
              )}
            </div>
          </article>
        ))}

        {optimisticMessage && (
          <article className="message-bubble user" dir="auto">
            <div className="message-avatar" aria-hidden="true"><span>{language === 'fa' ? 'ش' : 'Y'}</span></div>
            <div className="message-content"><p>{optimisticMessage}</p></div>
          </article>
        )}

        {sending && (
          <div className="typing-row" role="status">
            <Baby aria-hidden="true" size={18} />
            <span>{t(language, 'sending')}</span>
            <i /><i /><i />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer-wrap">
        <form className="composer" onSubmit={submit}>
          <textarea
            aria-label={t(language, 'placeholder')}
            dir="auto"
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
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
