import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { get } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CustomerProfilePanel } from '../components/CustomerProfilePanel.js'
import { InboxLayout } from '../components/InboxLayout.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { StatusPill } from '../components/StatusPill.js'

interface ContactRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
  tags: string[] | Record<string, unknown> | null
  total_conversations: number | null
  first_seen_at: string | null
  last_seen_at: string | null
  created_at: string | null
}

interface ConversationRow {
  id: string
  subject: string | null
  status: string
  visitor_email: string | null
  last_message_at: string | null
  created_at: string
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name || email || '').trim()
  if (!src) return '??'
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function tagsArray(tags: ContactRow['tags']): string[] {
  if (Array.isArray(tags)) return tags as string[]
  return []
}

function ContactDetailBody({
  contact,
  conversations,
  loading,
  error,
}: {
  contact: ContactRow | null
  conversations: ConversationRow[]
  loading: boolean
  error: string | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const displayName =
    contact?.name ||
    contact?.email ||
    t('contactDetail.contactFallback', {}, { defaultValue: 'Contact' })
  const tags = tagsArray(contact?.tags ?? null)
  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 6))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <Link
          to="/contacts"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-primary-dark uppercase tracking-widest hover:underline',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            arrow_back
          </span>
          {t('contactDetail.backToContacts', {}, { defaultValue: 'All contacts' })}
        </Link>
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
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('contactDetail.loading', {}, { defaultValue: 'Loading contact…' })}
          </p>
        ) : contact ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(16),
                cm.h(16),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'bg-primary/15 text-primary-dark',
              )}
            >
              {initialsFor(contact.name, contact.email)}
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
              <h1
                className={cm.cn(
                  cm.textSize('2xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {displayName}
              </h1>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {contact.email || ''}
                {contact.email && contact.company ? ' · ' : ''}
                {contact.company || ''}
              </span>
              {tags.length > 0 && (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.sp('mt', 1),
                    'flex-wrap',
                  )}
                >
                  {tags.map((tag) => (
                    <StatusPill key={tag} variant="unread" label={tag} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      {contact && (
        <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
          <KpiStatCard
            label={t('contactDetail.kpi.conversations', {}, { defaultValue: 'Conversations' })}
            value={String(contact.total_conversations ?? conversations.length)}
            trend={t(
              'contactDetail.kpi.conversationsTrend',
              { count: conversations.length },
              { defaultValue: '{{count}} on file' },
            )}
            icon="chat_bubble"
            accent="primary"
            trendTone="neutral"
          />
          <KpiStatCard
            label={t('contactDetail.kpi.firstSeen', {}, { defaultValue: 'First seen' })}
            value={formatDate(contact.first_seen_at)}
            trend={t('contactDetail.kpi.firstSeenTrend', {}, { defaultValue: 'Earliest contact' })}
            icon="event"
            accent="warning"
            trendTone="neutral"
          />
          <KpiStatCard
            label={t('contactDetail.kpi.lastSeen', {}, { defaultValue: 'Last seen' })}
            value={formatDate(contact.last_seen_at)}
            trend={
              relativeTime(contact.last_seen_at) ||
              t('contactDetail.kpi.lastSeenTrend', {}, { defaultValue: 'No recent activity' })
            }
            icon="schedule"
            accent="success"
            trendTone="up"
          />
        </section>
      )}

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 3 }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border border-[color:var(--color-border)]',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
          {t('contactDetail.history', {}, { defaultValue: 'Conversation history' })}
        </h2>
        {conversations.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'contactDetail.noHistory',
              {},
              { defaultValue: 'No conversations yet for this contact.' },
            )}
          </p>
        ) : (
          <ul
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'divide-y divide-[color:var(--color-border-secondary)]',
            )}
          >
            {conversations.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={`/conversation/${entry.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                    cm.sp('py', 3),
                    cm.sp('px', 1),
                    'hover:bg-surface-secondary rounded-md transition-colors',
                  )}
                >
                  <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                    <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                      {entry.subject || 'Conversation'}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {entry.status} · {relativeTime(entry.last_message_at || entry.created_at)}
                    </span>
                  </div>
                  <StatusPill variant={entry.status === 'closed' ? 'resolved' : 'pending'} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ContactDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [contact, setContact] = useState<ContactRow | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const c = await get<ContactRow>(`/api/contacts/${id}`)
        if (cancelled) return
        setContact(c.data ?? null)
        const email = c.data?.email
        if (email) {
          try {
            // Exact-match query (not full-text search) — visitor_email is
            // structured data; search index would match fuzzily and may
            // not have just-created rows indexed yet.
            const list = await get<ConversationRow[]>(
              `/api/conversations?visitor_email=${encodeURIComponent(email)}`,
            )
            if (cancelled) return
            setConversations(Array.isArray(list.data) ? list.data : [])
          } catch (_error) {
            // conversation lookup failed — clear list rather than show stale data
            if (!cancelled) setConversations([])
          }
        } else {
          setConversations([])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setContact(null)
          setConversations([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <InboxLayout
      main={
        <ContactDetailBody
          contact={contact}
          conversations={conversations}
          loading={loading}
          error={error}
        />
      }
      side={
        contact ? (
          <CustomerProfilePanel
            name={
              contact.name ||
              contact.email ||
              t('contactDetail.contactFallback', {}, { defaultValue: 'Contact' })
            }
            email={contact.email || ''}
            presence={conversations.some((c) => c.status !== 'closed') ? 'online' : 'offline'}
            csat={null}
            properties={[
              {
                label: t('auth.forgotPassword.email', {}, { defaultValue: 'Email' }),
                value: contact.email || '—',
              },
              {
                label: t('form.phone', {}, { defaultValue: 'Phone' }),
                value: contact.phone || '—',
              },
              {
                label: t('form.company', {}, { defaultValue: 'Company' }),
                value: contact.company || '—',
              },
              {
                label: t('contactDetail.kpi.firstSeen', {}, { defaultValue: 'First seen' }),
                value: formatDate(contact.first_seen_at),
              },
              {
                label: t('contactDetail.kpi.lastSeen', {}, { defaultValue: 'Last seen' }),
                value: formatDate(contact.last_seen_at),
              },
            ]}
            recent={conversations.slice(0, 5).map((c) => ({
              id: c.id,
              subject:
                c.subject ||
                t('contactDetail.conversationFallback', {}, { defaultValue: 'Conversation' }),
              ago: relativeTime(c.last_message_at || c.created_at),
              resolved: c.status === 'closed',
            }))}
          />
        ) : undefined
      }
    />
  )
}

export default ContactDetail
export { ContactDetail, ContactDetail as ContactDetailPage }
