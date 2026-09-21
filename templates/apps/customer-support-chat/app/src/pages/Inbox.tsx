import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { get, post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConversationListItem } from '../components/ConversationListItem.js'
import { CustomerProfilePanel } from '../components/CustomerProfilePanel.js'
import { InboxHeroCard } from '../components/InboxHeroCard.js'
import { InboxLayout } from '../components/InboxLayout.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { StatusPill } from '../components/StatusPill.js'

interface ConversationRow {
  id: string
  subject: string | null
  visitor_name: string | null
  visitor_email: string | null
  status: 'open' | 'assigned' | 'closed' | string
  priority: 'low' | 'normal' | 'high' | 'urgent' | string
  agent_id: string | null
  last_message_at: string | null
  created_at: string
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  limits: { maxConversations: number }
  isFree: boolean
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

function presenceFor(row: ConversationRow): 'online' | 'away' | 'offline' {
  if (row.status === 'closed') return 'offline'
  if (row.priority === 'urgent' || row.priority === 'high') return 'online'
  return 'away'
}

function initialsFor(row: ConversationRow): string | undefined {
  const src = row.visitor_name || row.visitor_email || row.subject || ''
  if (!src) return undefined
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ConversationList({
  rows,
  loading,
  error,
  onRetry,
  onSelect,
  selectedId,
  onSearch,
  searchValue,
  onCompose,
}: {
  rows: ConversationRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (id: string) => void
  selectedId: string | null
  onSearch: (q: string) => void
  searchValue: string
  onCompose: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }))}>
      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 4),
          'border-b border-[color:var(--color-border)] sticky top-0 bg-surface z-10',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
          </h2>
          <button
            type="button"
            onClick={onCompose}
            aria-label={t('inbox.newConversation', {}, { defaultValue: 'New conversation' })}
            className={cm.cn(
              cm.sp('px', 3),
              'py-2 min-h-[36px]',
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest rounded-full bg-primary text-white hover:opacity-90 transition',
            )}
          >
            {t('inbox.newConversation', {}, { defaultValue: '+ New' })}
          </button>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 3),
            'h-10 rounded-full bg-surface-secondary border border-[color:var(--color-border)] focus-within:border-primary',
          )}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 16 }}
            aria-hidden="true"
          >
            search
          </span>
          <input
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            className={cm.cn(
              cm.flex1,
              cm.sp('p', 0),
              cm.textSize('sm'),
              'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
            )}
            placeholder={t(
              'inbox.searchPlaceholder',
              {},
              { defaultValue: 'Search conversations…' },
            )}
            aria-label={t('inbox.searchPlaceholder', {}, { defaultValue: 'Search conversations…' })}
          />
        </div>
      </header>
      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'text-[var(--color-status-error-text)]',
          )}
        >
          <p className={cm.cn(cm.sp('mb', 2))}>
            {t('inbox.loadError', {}, { defaultValue: 'Could not load conversations.' })}
          </p>
          <p className={cm.cn(cm.sp('mb', 2), cm.textSize('xs'), 'text-on-surface-variant')}>
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'rounded-md bg-primary/10 text-primary-dark hover:bg-primary/15',
            )}
          >
            {t('inbox.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <div className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('inbox.loading', {}, { defaultValue: 'Loading conversations…' })}
        </div>
      ) : rows.length === 0 ? (
        <div className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'inbox.empty',
            {},
            { defaultValue: 'No conversations yet. Start one with the + New button above.' },
          )}
        </div>
      ) : (
        <ul
          className={cm.cn(cm.flex({ direction: 'col' }))}
          aria-label={t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        >
          {rows.map((row) => (
            <li key={row.id}>
              <ConversationListItem
                id={row.id}
                customerName={
                  row.visitor_name ||
                  row.visitor_email ||
                  row.subject ||
                  t('contactDetail.conversationFallback', {}, { defaultValue: 'Conversation' })
                }
                preview={row.subject || ''}
                timestamp={relativeTime(row.last_message_at || row.created_at)}
                unread={0}
                presence={presenceFor(row)}
                channelIcon={row.priority === 'urgent' ? 'priority_high' : 'chat'}
                active={row.id === selectedId}
                initials={initialsFor(row)}
                onClick={() => onSelect(row.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewConversationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [subject, setSubject] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Escape closes the modal (keyboard equivalent of the pointer-only
  // backdrop click).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { subject, priority }
      if (visitorName.trim()) body.visitor_name = visitorName.trim()
      if (visitorEmail.trim()) body.visitor_email = visitorEmail.trim()
      const resp = await post<{ id: string }>('/api/conversations', body)
      void track({
        name: 'conversation.created',
        properties: { conversation_id: resp.data.id, priority },
      })
      onCreated(resp.data.id)
      setSubject('')
      setVisitorName('')
      setVisitorEmail('')
      setPriority('normal')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Surface the server's message (e.g. tier-limit-exceeded) instead of
      // the raw HTTP error string when the body is JSON-encoded.
      try {
        const parsed = JSON.parse(msg.split(' - ').pop() ?? '{}') as {
          error?: string
          limitType?: string
          upgradeTier?: string
        }
        setError(parsed.error || msg)
      } catch (_error) {
        // JSON.parse failed — msg is not JSON-encoded, use it directly
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('newConversation.title', {}, { defaultValue: 'New conversation' })}
      className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cm.cn('absolute inset-0 bg-foreground/50')}
      />
      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 6),
          'relative bg-surface rounded-xl border border-[color:var(--color-border)] w-full max-w-lg shadow-xl',
        )}
      >
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
          {t('newConversation.title', {}, { defaultValue: 'New conversation' })}
        </h3>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
            )}
          >
            {error}
          </div>
        )}
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('newConversation.subject', {}, { defaultValue: 'Subject' })}
          </span>
          <input
            required
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
            )}
            placeholder={t(
              'newConversation.subjectPlaceholder',
              {},
              { defaultValue: 'What\u2019s the question?' },
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('newConversation.visitorName', {}, { defaultValue: 'Visitor name' })}
          </span>
          <input
            name="visitor_name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('newConversation.visitorEmail', {}, { defaultValue: 'Visitor email' })}
          </span>
          <input
            type="email"
            name="visitor_email"
            value={visitorEmail}
            onChange={(e) => setVisitorEmail(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
            )}
          />
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('form.priority', {}, { defaultValue: 'Priority' })}
          </span>
          <select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
            )}
          >
            <option value="low">{t('priority.low', {}, { defaultValue: 'Low' })}</option>
            <option value="normal">{t('priority.normal', {}, { defaultValue: 'Normal' })}</option>
            <option value="high">{t('priority.high', {}, { defaultValue: 'High' })}</option>
            <option value="urgent">{t('priority.urgent', {}, { defaultValue: 'Urgent' })}</option>
          </select>
        </label>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 2 }))}>
          <button
            type="button"
            onClick={onClose}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-md text-on-surface-variant hover:bg-surface-secondary',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={submitting || !subject.trim()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-sm hover:shadow-md disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('common.create', {}, { defaultValue: 'Create' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function InboxOverview({
  rows,
  billing,
}: {
  rows: ConversationRow[]
  billing: BillingStatus | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const open = rows.filter((r) => r.status === 'open' || r.status === 'assigned').length
  const closed = rows.filter((r) => r.status === 'closed').length
  const urgent = rows.filter((r) => r.priority === 'urgent' || r.priority === 'high').length
  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 6))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('inboxOverview.eyebrow', {}, { defaultValue: 'Today at a glance' })}
        </span>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
        </h1>
      </header>
      <InboxHeroCard
        activeConversations={open}
        changeLabel={t(
          'inboxOverview.heroChange',
          { count: open },
          { defaultValue: '{{count}} open' },
        )}
        slaPercent={billing?.isFree ? 90 : 99}
        avgFirstResponse={t('inboxOverview.firstReply', {}, { defaultValue: '—' })}
      />
      <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
        <KpiStatCard
          label={t('inboxOverview.kpiOpen', {}, { defaultValue: 'Open conversations' })}
          value={String(open)}
          trend={t(
            'inboxOverview.kpiOpenTrend',
            { count: urgent },
            { defaultValue: '{{count}} urgent' },
          )}
          icon="chat_bubble"
          accent="primary"
          trendTone="neutral"
        />
        <KpiStatCard
          label={t('status.resolved', {}, { defaultValue: 'Resolved' })}
          value={String(closed)}
          trend={t('inboxOverview.kpiClosedTrend', {}, { defaultValue: 'all-time' })}
          icon="task_alt"
          accent="success"
          trendTone="up"
        />
        <KpiStatCard
          label={t('nav.plan', {}, { defaultValue: 'Plan' })}
          value={billing?.name || '—'}
          trend={t(
            'inboxOverview.kpiPlanTrend',
            { limit: billing?.limits.maxConversations ?? 0 },
            { defaultValue: 'Up to {{limit}} convos' },
          )}
          icon="workspace_premium"
          accent="warning"
          trendTone="neutral"
        />
      </section>
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border border-[color:var(--color-border)]',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t('inboxOverview.queueTitle', {}, { defaultValue: 'Live queue' })}
          </h2>
          <StatusPill variant="online" />
        </header>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'inboxOverview.queueBody',
            {},
            {
              defaultValue:
                'Pick a conversation from the left to start replying. Click + New to open a new ticket.',
            },
          )}
        </p>
      </section>
    </div>
  )
}

function Inbox() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [composing, setComposing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchConversations = useCallback(async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url =
        q && q.trim().length > 0
          ? `/api/conversations?search=${encodeURIComponent(q.trim())}`
          : '/api/conversations'
      const resp = await get<ConversationRow[]>(url)
      setRows(Array.isArray(resp.data) ? resp.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
    void get<BillingStatus>('/api/billing/status')
      .then((r) => setBilling(r.data))
      .catch(() => setBilling(null))
  }, [fetchConversations])

  const filtered = useMemo(() => rows, [rows])

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      navigate(`/conversation/${id}`)
    },
    [navigate],
  )

  const selectedRow = filtered.find((r) => r.id === selectedId) ?? null

  return (
    <>
      <InboxLayout
        list={
          <ConversationList
            rows={filtered}
            loading={loading}
            error={error}
            onRetry={() => void fetchConversations(search)}
            onSelect={handleSelect}
            selectedId={selectedId}
            onSearch={(q) => {
              setSearch(q)
              void fetchConversations(q)
            }}
            searchValue={search}
            onCompose={() => setComposing(true)}
          />
        }
        main={<InboxOverview rows={filtered} billing={billing} />}
        side={
          selectedRow ? (
            <CustomerProfilePanel
              name={
                selectedRow.visitor_name ||
                selectedRow.visitor_email ||
                t('conversationDetail.visitorFallback', {}, { defaultValue: 'Visitor' })
              }
              email={selectedRow.visitor_email || ''}
              presence={presenceFor(selectedRow)}
              csat={null}
              properties={[
                {
                  label: t('newConversation.subject', {}, { defaultValue: 'Subject' }),
                  value: selectedRow.subject || '—',
                },
                {
                  label: t('nav.status', {}, { defaultValue: 'Status' }),
                  value: selectedRow.status,
                },
                {
                  label: t('form.priority', {}, { defaultValue: 'Priority' }),
                  value: selectedRow.priority,
                },
              ]}
              recent={[]}
            />
          ) : undefined
        }
      />
      <NewConversationModal
        open={composing}
        onClose={() => setComposing(false)}
        onCreated={(id) => {
          setComposing(false)
          void fetchConversations(search)
          navigate(`/conversation/${id}`)
        }}
      />
    </>
  )
}

export default Inbox
export { Inbox, Inbox as InboxPage }
