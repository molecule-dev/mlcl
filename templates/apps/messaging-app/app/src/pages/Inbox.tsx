import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChatSplitPaneHero } from '../components/ChatSplitPaneHero.js'
import { ConversationList } from '../components/ConversationList.js'
import { MessageThread } from '../components/MessageThread.js'
import { PresenceCard } from '../components/PresenceCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string
  initials: string
  avatar_index: number
  last_message: string
  last_message_at: string
  last_message_self: boolean
  unread_count: number
  presence: 'online' | 'away' | 'offline'
  muted: boolean
  encrypted: boolean
  member_count: number | null
  safety_number_verified: boolean
  disappearing_seconds: number
}

interface Contact {
  id: string
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
  status: string | null
  safety_number_verified: boolean
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  body: string
  sent_at: string
  delivered: boolean
  read: boolean
  self: boolean
  reactions: { emoji: string; count: number }[]
}

export function Inbox() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [convos, setConvos] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/conversations').catch(() => null),
      http.get('/api/contacts').catch(() => null),
      http.get('/api/messages').catch(() => null),
    ])
      .then(([cRes, cnRes, mRes]) => {
        if (cancelled) return
        setConvos(
          unwrapList<Conversation>(cRes).filter(
            (c) => !(c as unknown as { archived?: boolean }).archived,
          ),
        )
        setContacts(unwrapList<Contact>(cnRes))
        setMessages(unwrapList<Message>(mRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('inbox.loadError', {}, { defaultValue: 'Failed to load conversations.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return convos
    return convos.filter(
      (c) => c.name.toLowerCase().includes(q) || c.last_message.toLowerCase().includes(q),
    )
  }, [convos, search])

  const previewConvo = visible[0] ?? null
  const previewMessages = useMemo(
    () =>
      previewConvo ? messages.filter((m) => m.conversation_id === previewConvo.id).slice(-6) : [],
    [messages, previewConvo],
  )

  const stats = useMemo(
    () => ({
      total: convos.length,
      unread: convos.reduce((s, c) => s + c.unread_count, 0),
      encrypted: convos.filter((c) => c.encrypted).length,
      online: convos.filter((c) => c.type === 'direct' && c.presence === 'online').length,
    }),
    [convos],
  )

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('inbox.subheading', {}, { defaultValue: 'Encrypted by default. Quiet by design.' })}
          </p>
        </div>
        <Link
          to="/conversations/new"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 2.5),
            'text-sm font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            edit_square
          </span>
          {t('inbox.newLabel', {}, { defaultValue: 'New message' })}
        </Link>
      </header>

      <ChatSplitPaneHero
        totalConversations={stats.total}
        unreadCount={stats.unread}
        encryptedCount={stats.encrypted}
        onlineCount={stats.online}
      />

      {/* Two-pane split from md up (mirrors the shell's 768px breakpoint).
          On phones this collapses to the list alone — each row links to the
          full-height thread at /conversations/:id, so the read-only preview
          pane would only push the list below the fold. */}
      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-12 items-start')}>
        {/* Left: conversation list (5 cols on desktop) */}
        <div className={'md:col-span-5 stack space-y-4'}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'inbox.searchPlaceholder',
              {},
              { defaultValue: 'Search threads, people, content…' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2.5),
              'w-full bg-surface-container-low text-sm rounded-full border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
          />
          <div className={'rounded-2xl bg-surface-container-lowest p-3 shadow-sm'}>
            {visible.length === 0 ? (
              <p
                className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}
              >
                {t('inbox.empty', {}, { defaultValue: 'No conversations match.' })}
              </p>
            ) : (
              <ConversationList conversations={visible} activeId={previewConvo?.id ?? null} />
            )}
          </div>
        </div>

        {/* Right: thread preview + presence card (7 cols on desktop) */}
        <div className={'hidden md:block md:col-span-7 space-y-4'}>
          {previewConvo && (
            <MessageThread
              messages={previewMessages}
              headerLabel={previewConvo.name}
              showEncryptionBanner={previewConvo.encrypted}
            />
          )}
          <PresenceCard contacts={contacts} />
        </div>
      </section>
    </div>
  )
}
