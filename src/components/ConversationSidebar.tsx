import { MessageCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { formatConversationTime, t } from '../i18n'
import type { Conversation, Language } from '../types'

interface ConversationSidebarProps {
  conversations: Conversation[]
  language: Language
  loading: boolean
  open: boolean
  selectedId: string | null
  onClose: () => void
  onDelete: (conversation: Conversation) => void
  onNew: () => void
  onRename: (conversation: Conversation) => void
  onSelect: (id: string) => void
}

export function ConversationSidebar({
  conversations,
  language,
  loading,
  open,
  selectedId,
  onClose,
  onDelete,
  onNew,
  onRename,
  onSelect,
}: ConversationSidebarProps) {
  return (
    <>
      {open && <button className="sidebar-scrim" type="button" aria-label={t(language, 'close')} onClick={onClose} />}
      <aside className={`conversation-sidebar${open ? ' is-open' : ''}`} aria-label={t(language, 'conversations')}>
        <div className="sidebar-header">
          <div>
            <p className="eyebrow">{t(language, 'conversations')}</p>
            <strong>{t(language, 'appName')}</strong>
          </div>
          <button className="icon-button mobile-only" type="button" aria-label={t(language, 'close')} onClick={onClose}>
            <X aria-hidden="true" size={21} />
          </button>
        </div>

        <button className="new-chat-button" type="button" onClick={onNew}>
          <Plus aria-hidden="true" size={20} />
          {t(language, 'newChat')}
        </button>

        <div className="conversation-list" aria-live="polite">
          {loading && Array.from({ length: 3 }).map((_, index) => <div className="conversation-skeleton" key={index} />)}
          {!loading && conversations.length === 0 && (
            <div className="sidebar-empty">
              <MessageCircle aria-hidden="true" size={25} />
              <span>{t(language, 'noHistory')}</span>
            </div>
          )}
          {conversations.map((conversation) => (
            <div className={`conversation-row${selectedId === conversation.id ? ' is-selected' : ''}`} key={conversation.id}>
              <button
                className="conversation-select"
                type="button"
                onClick={() => {
                  onSelect(conversation.id)
                  onClose()
                }}
              >
                <span>{conversation.title}</span>
                <small>{formatConversationTime(language, conversation.last_message_at ?? conversation.created_at)}</small>
              </button>
              <div className="conversation-actions">
                <button type="button" aria-label={t(language, 'renameConversation')} onClick={() => onRename(conversation)}>
                  <Pencil aria-hidden="true" size={16} />
                </button>
                <button type="button" aria-label={t(language, 'deleteConversation')} onClick={() => onDelete(conversation)}>
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
