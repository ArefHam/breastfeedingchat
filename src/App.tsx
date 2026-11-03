import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { Baby, ChevronDown, Languages, Menu, ShieldCheck } from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { ChatView } from './components/ChatView'
import { ConversationSidebar } from './components/ConversationSidebar'
import { Dialog, type DialogRequest } from './components/Dialog'
import { direction, t } from './i18n'
import { supabase } from './lib/supabase'
import { titleSchema } from './lib/validation'
import type { ChatMessage, ChatResponse, Conversation, Language } from './types'
import './styles.css'

const LANGUAGE_KEY = 'breastfeeding_chat_language'
const PENDING_POLL_MS = 4000

function hasPendingMessage(messages: ChatMessage[] | undefined): boolean {
  return Boolean(messages?.some((message) => message.role === 'user' && message.status === 'pending'))
}

function initialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  return stored === 'en' ? 'en' : 'fa'
}

export default function App() {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const initializedSelection = useRef(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      if (!nextSession) {
        setSelectedId(null)
        initializedSelection.current = false
        queryClient.clear()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language)
    document.documentElement.lang = language
    document.documentElement.dir = direction(language)
    document.title = t(language, 'appName')
  }, [language])

  const conversationsQuery = useQuery({
    queryKey: ['conversations', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100)
      if (error) throw error
      return data as Conversation[]
    },
  })

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

  useEffect(() => {
    if (!initializedSelection.current && conversations.length > 0) {
      setSelectedId(conversations[0].id)
      initializedSelection.current = true
    }
  }, [conversations])

  const messagesQuery = useQuery({
    queryKey: ['messages', selectedId],
    enabled: Boolean(session && selectedId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedId!)
        .order('sequence', { ascending: true })
        .limit(500)
      if (error) throw error
      return data as ChatMessage[]
    },
    // Keep checking while an answer is still pending, e.g. after the browser lost its connection mid-request.
    refetchInterval: (query) => (hasPendingMessage(query.state.data) ? PENDING_POLL_MS : false),
  })

  const pendingInView = hasPendingMessage(messagesQuery.data)
  const wasPending = useRef(false)
  useEffect(() => {
    // When a pending answer arrives by polling, refresh the sidebar and clear the error banner.
    if (wasPending.current && !pendingInView) {
      setNotice(null)
      void queryClient.invalidateQueries({ queryKey: ['conversations', session?.user.id] })
    }
    wasPending.current = pendingInView
  }, [pendingInView, queryClient, session?.user.id])

  useEffect(() => {
    if (!accountOpen) return
    function onPointer(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  const sendMutation = useMutation({
    mutationFn: async ({ message, requestId, conversationId }: { message: string; requestId: string; conversationId: string | null }) => {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          conversationId,
          requestId,
          message,
          language,
        },
      })
      if (error) throw error
      return data as ChatResponse
    },
    onSuccess: async (response) => {
      setSelectedId(response.conversation.id)
      initializedSelection.current = true
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversations', session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['messages', response.conversation.id] }),
      ])
    },
  })

  async function sendMessage(message: string, requestId: string = crypto.randomUUID(), conversationId: string | null = selectedId) {
    setNotice(null)
    setOptimisticMessage(message)
    try {
      await sendMutation.mutateAsync({ message, requestId, conversationId })
    } catch (error) {
      const context = (error as { context?: Response })?.context
      const status = context?.status
      let failedConversationId = conversationId
      try {
        const errorBody = await context?.clone().json() as { conversationId?: unknown } | undefined
        if (typeof errorBody?.conversationId === 'string') failedConversationId = errorBody.conversationId
      } catch {
        // A non-JSON gateway failure has no conversation metadata.
      }
      if (failedConversationId) {
        setSelectedId(failedConversationId)
        initializedSelection.current = true
      }
      const errorName = (error as { name?: string })?.name
      if (status === 409) {
        // The same message is still being answered on the server; polling picks the answer up.
        setNotice(null)
      } else if (status === 429) {
        setNotice(t(language, 'rateLimited'))
      } else if (errorName === 'FunctionsFetchError' || !context) {
        setNotice(t(language, 'networkError'))
      } else {
        setNotice(t(language, 'sendError'))
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversations', session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['messages', failedConversationId] }),
      ])
    } finally {
      setOptimisticMessage(null)
    }
  }

  function startNewConversation() {
    setSelectedId(null)
    initializedSelection.current = true
    setSidebarOpen(false)
    setNotice(null)
  }

  function renameConversation(conversation: Conversation) {
    setDialog({
      title: t(language, 'renameConversation'),
      body: t(language, 'renamePrompt'),
      input: { value: conversation.title, maxLength: 120 },
      confirmLabel: t(language, 'save'),
      onConfirm: async (value) => {
        const parsed = titleSchema.safeParse(value)
        if (!parsed.success) return t(language, 'actionFailed')
        const { error } = await supabase.from('conversations').update({ title: parsed.data }).eq('id', conversation.id)
        if (error) return t(language, 'actionFailed')
        await queryClient.invalidateQueries({ queryKey: ['conversations', session?.user.id] })
      },
    })
  }

  function deleteConversation(conversation: Conversation) {
    setDialog({
      title: t(language, 'deleteConversation'),
      body: t(language, 'deleteConversationConfirm'),
      confirmLabel: t(language, 'deleteConversation'),
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from('conversations').delete().eq('id', conversation.id)
        if (error) return t(language, 'actionFailed')
        if (selectedId === conversation.id) setSelectedId(null)
        await queryClient.invalidateQueries({ queryKey: ['conversations', session?.user.id] })
      },
    })
  }

  function deleteAccount() {
    const email = session?.user.email
    if (!email) return
    setAccountOpen(false)
    setDialog({
      title: t(language, 'deleteAccount'),
      body: t(language, 'deleteAccountPrompt'),
      input: { value: '', dir: 'ltr', type: 'email' },
      confirmLabel: t(language, 'deleteAccount'),
      danger: true,
      onConfirm: async (value) => {
        const confirmation = value.trim()
        if (confirmation.toLowerCase() !== email.toLowerCase()) return t(language, 'emailMismatch')
        const { error } = await supabase.functions.invoke('delete-account', { body: { confirmation } })
        if (error) return t(language, 'actionFailed')
        await supabase.auth.signOut()
      },
    })
  }

  function toggleLanguage() {
    setLanguage((current) => (current === 'fa' ? 'en' : 'fa'))
  }

  if (!authReady) {
    return <div className="app-loading" role="status"><Baby aria-hidden="true" size={34} /></div>
  }

  if (!session) {
    return <AuthScreen language={language} onToggleLanguage={toggleLanguage} />
  }

  return (
    <div className="app-shell" dir={direction(language)}>
      <ConversationSidebar
        conversations={conversations}
        language={language}
        loading={conversationsQuery.isLoading}
        open={sidebarOpen}
        selectedId={selectedId}
        onClose={() => setSidebarOpen(false)}
        onDelete={deleteConversation}
        onNew={startNewConversation}
        onRename={renameConversation}
        onSelect={setSelectedId}
      />

      <main className="app-main">
        <header className="app-header">
          <div className="header-brand">
            <button className="icon-button mobile-only" type="button" aria-label={t(language, 'menu')} onClick={() => setSidebarOpen(true)}>
              <Menu aria-hidden="true" size={22} />
            </button>
            <div className="header-mark" aria-hidden="true"><Baby size={24} /></div>
            <div>
              <strong>{t(language, 'appName')}</strong>
              <span><ShieldCheck aria-hidden="true" size={14} />{language === 'fa' ? 'گفتگوی خصوصی' : 'Private conversation'}</span>
            </div>
          </div>

          <div className="header-actions">
            <button className="language-button" type="button" onClick={toggleLanguage}>
              <Languages aria-hidden="true" size={17} />{t(language, 'language')}
            </button>
            <div className="account-control" ref={accountRef}>
              <button className="account-trigger" type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)}>
                <span aria-hidden="true">{session.user.email?.slice(0, 1).toUpperCase()}</span>
                <ChevronDown aria-hidden="true" size={16} />
              </button>
              {accountOpen && (
                <div className="account-popover">
                  <p>{t(language, 'account')}</p>
                  <strong dir="ltr">{session.user.email}</strong>
                  <button type="button" onClick={() => void supabase.auth.signOut()}>{t(language, 'logout')}</button>
                  <button className="danger-action" type="button" onClick={deleteAccount}>{t(language, 'deleteAccount')}</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && <div className="notice-banner" role="alert">{notice}</div>}
        {conversationsQuery.isError && <div className="notice-banner" role="alert">{t(language, 'loadError')}</div>}
        <ChatView
          language={language}
          messages={messagesQuery.data ?? []}
          optimisticMessage={optimisticMessage}
          sending={sendMutation.isPending}
          onSend={sendMessage}
          onRetry={(message) => sendMessage(message.content, message.request_id, message.conversation_id)}
        />
      </main>
      {dialog && <Dialog language={language} request={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}
