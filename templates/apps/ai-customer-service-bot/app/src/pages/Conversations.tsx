import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { get, post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ConversationListItem } from '../components/ConversationListItem.js'
import { RapportLayout } from '../components/RapportLayout.js'
import { StatusBadge, type StatusVariant } from '../components/StatusBadge.js'

interface ConversationRow {
  id: string
  customer_name: string | null
  customer_email: string | null
  channel: string
  status: string
  escalated: boolean
  message_count: number
  last_message_at: string | null
  started_at: string
}

const FILTERS: Array<{
  id: 'all' | 'open' | 'escalated' | 'resolved'
  labelKey: string
  labelDefault: string
}> = [
  { id: 'all', labelKey: 'conversations.filters.all', labelDefault: 'All' },
  { id: 'open', labelKey: 'conversations.filters.open', labelDefault: 'Open' },
  { id: 'escalated', labelKey: 'conversations.filters.escalated', labelDefault: 'Escalated' },
  { id: 'resolved', labelKey: 'conversations.filters.resolved', labelDefault: 'Resolved' },
]

function statusVariant(status: string, escalated: boolean): StatusVariant {
  if (escalated) return 'escalated'
  if (status === 'resolved' || status === 'closed') return 'resolved'
  if (status === 'pending' || status === 'open') return 'active'
  return 'pending'
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

function initialsOf(name: string | null): string {
  if (!name) return '?'
  return (
    name
      .split(/\s+/)
      .map((s) => s[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

function Conversations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'open' | 'escalated' | 'resolved'>('all')
  const [search, setSearch] = useState('')
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMessage, setNewMessage] = useState('')

  async function loadList() {
    setLoading(true)
    setError(null)
    try {
      const response = await get<ConversationRow[]>('/api/conversations')
      const rows = Array.isArray(response.data) ? response.data : []
      setConversations(rows)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('conversations.loadError', {}, { defaultValue: 'Failed to load conversations' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === 'escalated' && !c.escalated) return false
      if (filter === 'open' && !(c.status === 'open' || c.status === 'pending')) return false
      if (filter === 'resolved' && !(c.status === 'resolved' || c.status === 'closed')) return false
      const haystack =
        `${c.customer_name ?? ''} ${c.customer_email ?? ''} ${c.channel}`.toLowerCase()
      if (search && !haystack.includes(search.toLowerCase())) return false
      return true
    })
  }, [conversations, filter, search])

  const counts = useMemo(() => {
    const acc = { active: 0, pending: 0, escalated: 0, resolved: 0 }
    for (const c of conversations) {
      const variant = statusVariant(c.status, c.escalated)
      if (variant === 'active') acc.active += 1
      else if (variant === 'pending') acc.pending += 1
      else if (variant === 'escalated') acc.escalated += 1
      else if (variant === 'resolved') acc.resolved += 1
    }
    return acc
  }, [conversations])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const response = await post<{ id: string }>('/api/conversations', {
        customerName: newName || undefined,
        initialMessage: newMessage || undefined,
        channel: 'web',
      })
      const newId = response.data?.id
      track({
        name: 'conversation.started',
        properties: { conversation_id: newId, channel: 'web' },
      })
      setShowNew(false)
      setNewName('')
      setNewMessage('')
      await loadList()
      if (newId) navigate(`/conversations/${newId}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('conversations.createError', {}, { defaultValue: 'Failed to start conversation' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <RapportLayout bare>
      <div
        data-mol-id="page-conversations"
        className={cm.cn(cm.flex(), cm.h('full'), 'overflow-hidden')}
      >
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.w('full'),
            'xl:w-[360px]',
            cm.h('full'),
            'border-r border-outline-variant/30 bg-surface-container-lowest',
          )}
        >
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 4 }),
              'border-b border-outline-variant/30',
            )}
          >
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'tracking-tight text-on-background',
                )}
              >
                {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
              </h2>
              <button
                data-mol-id="conversations-new"
                type="button"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.touchTargetCompact,
                  'rounded-full bg-primary text-on-primary px-3 py-1.5 hover:scale-[1.02] transition-transform',
                )}
                onClick={() => setShowNew((s) => !s)}
              >
                <span className="material-symbols-outlined text-base">add</span>
                {t('status.new', {}, { defaultValue: 'New' })}
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none">
                search
              </span>
              <input
                data-mol-id="conversations-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'conversations.searchPlaceholder',
                  {},
                  { defaultValue: 'Search threads' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-full bg-surface-container-low focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none transition-all',
                )}
                type="search"
              />
            </div>
            <div
              className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}
              data-mol-id="conversations-filters"
            >
              {FILTERS.map((f) => {
                const active = filter === f.id
                return (
                  <button
                    key={f.id}
                    data-mol-id={`filter-${f.id}`}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      cm.touchTargetCompact,
                      'rounded-full px-3 py-1 transition-colors',
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {t(f.labelKey, {}, { defaultValue: f.labelDefault })}
                  </button>
                )
              })}
            </div>
          </div>
          {showNew && (
            <form
              data-mol-id="conversations-new-form"
              onSubmit={handleCreate}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ direction: 'col', gap: 3 }),
                'border-b border-outline-variant/30 bg-surface-container-low',
              )}
            >
              <input
                data-mol-id="conversations-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t(
                  'conversations.newCustomerPlaceholder',
                  {},
                  { defaultValue: 'Who are you helping?' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container-lowest border border-outline-variant/40 outline-none focus:border-primary',
                )}
              />
              <textarea
                data-mol-id="conversations-new-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t(
                  'conversations.newMessagePlaceholder',
                  {},
                  { defaultValue: 'First message (optional)' },
                )}
                rows={3}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container-lowest border border-outline-variant/40 outline-none focus:border-primary resize-none',
                )}
              />
              <div className={cm.cn(cm.flex({ gap: 2 }))}>
                <button
                  data-mol-id="conversations-new-submit"
                  type="submit"
                  disabled={creating}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'rounded-full bg-primary text-on-primary px-4 py-2',
                  )}
                >
                  {creating
                    ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                    : t('conversations.startCta', {}, { defaultValue: 'Start conversation' })}
                </button>
                <button
                  data-mol-id="conversations-new-cancel"
                  type="button"
                  onClick={() => setShowNew(false)}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'rounded-full bg-surface-container-low text-on-surface px-4 py-2',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            </form>
          )}
          <div className={cm.cn(cm.flex1, cm.stack(1), cm.sp('p', 2), 'overflow-y-auto')}>
            {loading ? (
              <div
                data-mol-id="conversations-loading"
                className={cm.cn(cm.textCenter, cm.sp('p', 6), 'text-on-surface-variant')}
              >
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </div>
            ) : error ? (
              <div
                data-mol-id="conversations-error"
                role="alert"
                className={cm.cn(cm.textCenter, cm.sp('p', 6), 'text-error')}
              >
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div
                data-mol-id="conversations-empty"
                className={cm.cn(
                  cm.textCenter,
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col', gap: 2 }),
                  'text-on-surface-variant',
                )}
              >
                <span>
                  {t(
                    'conversations.empty',
                    {},
                    { defaultValue: 'No conversations yet — start your first one!' },
                  )}
                </span>
              </div>
            ) : (
              filtered.map((c) => (
                <ConversationListItem
                  key={c.id}
                  id={c.id}
                  customerName={
                    c.customer_name ??
                    t('conversations.anonymous', {}, { defaultValue: 'Anonymous' })
                  }
                  preview={c.customer_email ?? c.channel}
                  timestamp={relativeTime(c.last_message_at ?? c.started_at)}
                  unread={c.message_count}
                  status={statusVariant(c.status, c.escalated)}
                  active={false}
                  initials={initialsOf(c.customer_name)}
                />
              ))
            )}
          </div>
        </aside>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.flex1,
            cm.sp('p', 12),
            'hidden xl:flex',
            'bg-[var(--color-bg-sidebar)] text-center',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              'bg-primary/10 mb-6',
            )}
          >
            <span className="material-symbols-outlined text-primary text-4xl">forum</span>
          </div>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('2xl'),
              cm.sp('mb', 2),
              'tracking-tight text-on-background',
            )}
          >
            {t(
              'conversations.emptyHeadline',
              {},
              { defaultValue: 'Pick a conversation to dive in' },
            )}
          </h3>
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md leading-relaxed')}
          >
            {t(
              'conversations.emptyBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} groups threads by status and recency. Customer context, AI suggestions, and quick actions appear here once you open one.',
              },
            )}
          </p>
        </section>

        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 6 }),
            cm.w('[300px]'),
            cm.h('full'),
            cm.sp('p', 5),
            'hidden xl:flex border-l border-outline-variant/30 bg-surface-container-lowest overflow-y-auto',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'tracking-widest uppercase text-on-surface-variant',
              )}
            >
              {t('conversations.context.queue', {}, { defaultValue: 'Queue health' })}
            </span>
            <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }))}>
              <span
                data-mol-id="conversations-total"
                className={cm.cn(cm.fontWeight('bold'), 'text-4xl text-on-surface tracking-tight')}
              >
                {counts.active + counts.pending + counts.escalated}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('conversations.context.openThreads', {}, { defaultValue: 'open threads' })}
              </span>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'tracking-widest uppercase text-on-surface-variant',
              )}
            >
              {t('conversations.context.byStatus', {}, { defaultValue: 'By status' })}
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              {(['active', 'pending', 'escalated', 'resolved'] as const).map((s) => (
                <div key={s} className={cm.flex({ align: 'center', justify: 'between' })}>
                  <StatusBadge variant={s} />
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface tabular-nums',
                    )}
                  >
                    {counts[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Link
            to="/knowledge"
            className={cm.cn(
              cm.textSize('xs'),
              'text-primary hover:text-primary-container transition-colors',
            )}
          >
            {t('conversations.context.kbLink', {}, { defaultValue: 'Browse knowledge base →' })}
          </Link>
        </aside>
      </div>
    </RapportLayout>
  )
}

export default Conversations
export { Conversations, Conversations as ConversationsPage }
