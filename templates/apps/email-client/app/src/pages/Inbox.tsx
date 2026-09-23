import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MeridianAppShell } from '../components/MeridianAppShell.js'
import { MeridianMessageCard } from '../components/MeridianMessageCard.js'
import { MeridianThreadRow } from '../components/MeridianThreadRow.js'
import type { EmailLabel, EmailRow } from '../lib/api.js'
import {
  deriveInitials,
  emailToThreadRow,
  ensureArray,
  formatRelativeTimestamp,
} from '../lib/api.js'
import { readPrefs } from '../lib/preferences.js'
import { useEmails, useLabels } from '../lib/useEmails.js'
import { useIsMobile } from '../lib/useIsMobile.js'

const TABS = [
  { key: 'primary', icon: 'inbox', defaultLabel: 'Primary' },
  { key: 'social', icon: 'group', defaultLabel: 'Social' },
  { key: 'promos', icon: 'local_offer', defaultLabel: 'Promotions' },
  { key: 'updates', icon: 'campaign', defaultLabel: 'Updates' },
] as const

const SOCIAL_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'tiktok.com',
]
const PROMO_HINTS = ['receipt', 'invoice', 'offer', 'sale', 'deal', 'discount', 'stripe.com']
const UPDATE_HINTS = [
  'github.com',
  'gitlab.com',
  'notion',
  'slack',
  'newsletter',
  'weekly',
  'daily',
]

function classifyTab(row: EmailRow): (typeof TABS)[number]['key'] {
  const from = (row.from || '').toLowerCase()
  if (SOCIAL_DOMAINS.some((d) => from.includes(d))) return 'social'
  if (PROMO_HINTS.some((p) => from.includes(p) || (row.subject || '').toLowerCase().includes(p)))
    return 'promos'
  if (UPDATE_HINTS.some((u) => from.includes(u))) return 'updates'
  return 'primary'
}

export function Inbox() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const labelFilter = params.get('label') ?? null
  const searchQuery = (params.get('search') ?? '').trim() || null
  // Reading-view preferences (Settings): whether to show the inline preview pane and how dense the
  // thread rows are. Read on render so returning from Settings reflects the change.
  const { preview: showPreview, compact } = readPrefs()

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('primary')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileSelectedId, setMobileSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const isMobile = useIsMobile()

  const { emails, loading, error, refetch, setEmails } = useEmails({
    folder: searchQuery ? undefined : 'inbox',
    label: labelFilter ?? undefined,
    search: searchQuery ?? undefined,
    refreshKey,
    limit: 100,
  })
  const { labels } = useLabels()
  const labelsById: Record<string, EmailLabel> = useMemo(() => {
    const out: Record<string, EmailLabel> = {}
    for (const l of labels) out[l.id] = l
    return out
  }, [labels])

  const filtered = useMemo(() => {
    // When the user filters by label or types a search query, the API
    // already filtered server-side — show every row it returned. Tab
    // classification only applies to the default inbox view.
    if (labelFilter || searchQuery) return emails
    return emails.filter((row) => classifyTab(row) === activeTab)
  }, [emails, labelFilter, searchQuery, activeTab])

  // Desktop convenience: keep the first row selected when nothing was
  // picked. Mobile collapses to list → detail: only a tap selects, so the
  // list stays full-width until the user actually opens a message.
  const selected = isMobile
    ? (filtered.find((e) => e.id === mobileSelectedId) ?? null)
    : (filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null)
  const selectedIndex = selected ? filtered.findIndex((e) => e.id === selected.id) : -1

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    void refetch()
  }, [refetch])

  const toggleStar = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.map((e) => (e.id === id ? { ...e, is_starred: !e.is_starred } : e)))
      try {
        await http.put(`/api/emails/${id}/star`)
        track({ name: 'email.starred', properties: { email_id: id } })
      } catch (_error) {
        // optimistic update failed — refetch to restore correct state
        refresh()
      } finally {
        setRefreshKey((k) => k + 1)
      }
    },
    [http, setEmails, refresh],
  )

  const moveTo = useCallback(
    async (id: string, folder: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      setMobileSelectedId(null)
      try {
        await http.put(`/api/emails/${id}/move`, { folder })
        track({ name: 'folder.moved', properties: { email_id: id, folder } })
      } finally {
        setRefreshKey((k) => k + 1)
      }
    },
    [http, setEmails],
  )

  const removeEmail = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      setMobileSelectedId(null)
      try {
        await http.delete(`/api/emails/${id}`)
        track({ name: 'email.deleted', properties: { email_id: id, permanent: false } })
      } finally {
        setRefreshKey((k) => k + 1)
      }
    },
    [http, setEmails],
  )

  const markRead = useCallback(
    async (id: string, isRead: boolean) => {
      setEmails((curr) => curr.map((e) => (e.id === id ? { ...e, is_read: isRead } : e)))
      try {
        await http.put(`/api/emails/${id}/read`, { is_read: isRead })
      } finally {
        setRefreshKey((k) => k + 1)
      }
    },
    [http, setEmails],
  )

  const onSelect = useCallback(
    (row: EmailRow) => {
      if (!row.is_read) void markRead(row.id, true)
      // Preview pane off ("read without leaving the list" disabled) → open the full thread page.
      if (!showPreview) {
        navigate(`/thread/${row.id}`)
        return
      }
      if (isMobile) setMobileSelectedId(row.id)
      else setSelectedId(row.id)
    },
    [markRead, showPreview, navigate, isMobile],
  )

  const goPrevious = () => {
    if (selectedIndex > 0) onSelect(filtered[selectedIndex - 1]!)
  }
  const goNext = () => {
    if (selectedIndex >= 0 && selectedIndex < filtered.length - 1)
      onSelect(filtered[selectedIndex + 1]!)
  }

  return (
    <MeridianAppShell refreshKey={refreshKey}>
      <div className={cm.cn(cm.flex({}), 'h-full overflow-hidden')} data-mol-id="page-inbox">
        {/* Thread list — on mobile it collapses to full width and hides
            while a message is open (back button restores it). */}
        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            showPreview
              ? isMobile
                ? selected
                  ? 'hidden'
                  : cm.w('full')
                : 'w-[400px] shrink-0 border-r border-outline-variant/40'
              : cm.flex1,
            'bg-surface',
          )}
        >
          <div
            className={cm.cn(cm.flex({}), 'border-b border-outline-variant/40 h-[52px] shrink-0')}
            role="tablist"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  data-mol-id={`inbox-tab-${tab.key}`}
                  className={cm.cn(
                    cm.flex1,
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    cm.cursorPointer,
                    cm.fontWeight(active ? 'semibold' : 'medium'),
                    'transition-colors',
                    active
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
                  )}
                >
                  <span
                    className={'material-symbols-outlined text-base'}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </span>
                  {t(`meridian.inbox.tab.${tab.key}`, {}, { defaultValue: tab.defaultLabel })}
                </button>
              )
            })}
          </div>

          <div className={cm.cn(cm.flex1, 'overflow-y-auto')} data-mol-id="inbox-thread-list">
            {loading && (
              <div
                className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}
                data-mol-id="inbox-loading"
              >
                {t('meridian.inbox.loading', {}, { defaultValue: 'Loading…' })}
              </div>
            )}
            {!loading && error && (
              <div className={cm.cn(cm.sp('p', 6), 'text-error text-sm')} data-mol-id="inbox-error">
                {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div
                className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}
                data-mol-id="inbox-empty"
              >
                {t('meridian.inbox.empty', {}, { defaultValue: 'No messages here yet.' })}
              </div>
            )}
            {filtered.map((row) => (
              <MeridianThreadRow
                key={row.id}
                thread={emailToThreadRow(row, labelsById)}
                active={showPreview && selected?.id === row.id}
                compact={compact}
                onClick={() => onSelect(row)}
                onToggleStar={() => toggleStar(row.id)}
              />
            ))}
          </div>
        </section>

        {/* Reading pane — hidden when the "Show preview pane" preference is
            off; on mobile it is hidden until a message is opened. */}
        {showPreview && (
          <section
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.flex1,
              isMobile && !selected && 'hidden',
              'min-w-0 bg-surface-container-lowest',
            )}
          >
            {selected ? (
              <ReadingPane
                email={selected}
                labelsById={labelsById}
                indexLabel={t(
                  'meridian.inbox.ofTotal',
                  { current: selectedIndex + 1, total: filtered.length },
                  { defaultValue: '{{current}} of {{total}}' },
                )}
                onBack={isMobile ? () => setMobileSelectedId(null) : undefined}
                onPrev={goPrevious}
                onNext={goNext}
                hasPrev={selectedIndex > 0}
                hasNext={selectedIndex >= 0 && selectedIndex < filtered.length - 1}
                onArchive={() => moveTo(selected.id, 'archive')}
                onSpam={() => moveTo(selected.id, 'spam')}
                onTrash={() => removeEmail(selected.id)}
                onSent={() => refresh()}
                t={t}
                cm={cm}
                http={http}
              />
            ) : (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-full text-on-surface-variant',
                )}
              >
                {t(
                  'meridian.inbox.selectMessage',
                  {},
                  { defaultValue: 'Select a message to read' },
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </MeridianAppShell>
  )
}

interface ReadingPaneProps {
  email: EmailRow
  labelsById: Record<string, EmailLabel>
  indexLabel: string
  /** Mobile list → detail: provided on mobile to render a back button. */
  onBack?: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  onArchive: () => Promise<void>
  onSpam: () => Promise<void>
  onTrash: () => Promise<void>
  onSent: () => void
  t: ReturnType<typeof useTranslation>['t']
  cm: ReturnType<typeof getClassMap>
  http: ReturnType<typeof useHttpClient>
}

function ReadingPane({
  email,
  labelsById,
  indexLabel,
  onBack,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onArchive,
  onSpam,
  onTrash,
  onSent,
  t,
  cm,
  http,
}: ReadingPaneProps) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const labelChips =
    email.label_id && labelsById[email.label_id]
      ? [{ name: labelsById[email.label_id]!.name, color: labelsById[email.label_id]!.color }]
      : []

  const recipientsList = ensureArray(email.to).join(', ')
  const senderEmail = email.from
  const senderName = senderEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || senderEmail
  const initials = deriveInitials(senderEmail)

  const sendReply = useCallback(async () => {
    if (!reply.trim()) return
    setSending(true)
    setFeedback(null)
    try {
      const res = await http.post<{ delivery?: string; delivery_error?: string | null }>(
        '/api/emails/send',
        {
          to: email.from,
          subject: email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`,
          body: reply,
          thread_id: email.thread_id ?? email.id,
        },
      )
      const data =
        (res as { data?: { delivery?: string; delivery_error?: string | null } }).data ??
        (res as { delivery?: string; delivery_error?: string | null })
      const delivery = data.delivery ?? 'sent'
      const deliveryError = data.delivery_error ?? null
      if (delivery === 'sent') {
        setFeedback(t('meridian.inbox.replySent', {}, { defaultValue: 'Reply sent.' }))
        track({
          name: 'email.sent',
          properties: {
            email_id: email.thread_id ?? email.id,
            reply_to: email.from,
            kind: 'reply',
          },
        })
      } else {
        setFeedback(
          t(
            'meridian.inbox.replyFailed',
            { error: deliveryError ?? 'unknown' },
            { defaultValue: 'Reply saved but delivery failed: {{error}}' },
          ),
        )
      }
      setReply('')
      onSent()
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : t('meridian.inbox.replyFailedGeneric', {}, { defaultValue: 'Reply failed' }),
      )
    } finally {
      setSending(false)
    }
  }, [reply, http, email, onSent, t])

  return (
    <>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          'h-14 shrink-0 border-b border-outline-variant/40 bg-surface',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-on-surface-variant')}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              data-mol-id="reading-back"
              aria-label={t('common.back', {}, { defaultValue: 'Back' })}
              className={cm.cn(
                cm.sp('p', 2),
                cm.cursorPointer,
                'rounded-full hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onArchive}
            data-mol-id="reading-archive"
            aria-label={t('common.archive', {}, { defaultValue: 'Archive' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.cursorPointer,
              'rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              archive
            </span>
          </button>
          <button
            type="button"
            onClick={onTrash}
            data-mol-id="reading-delete"
            aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.cursorPointer,
              'rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              delete
            </span>
          </button>
          <button
            type="button"
            onClick={onSpam}
            data-mol-id="reading-spam"
            aria-label={t('meridian.inbox.spam', {}, { defaultValue: 'Spam' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.cursorPointer,
              'rounded-full hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              report
            </span>
          </button>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className="tabular-nums" data-mol-id="reading-index">
            {indexLabel}
          </span>
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            data-mol-id="reading-prev"
            className={cm.cn(
              cm.sp('p', 1),
              'rounded hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            aria-label={t('meridian.inbox.previous', {}, { defaultValue: 'Previous' })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            data-mol-id="reading-next"
            className={cm.cn(
              cm.sp('p', 1),
              'rounded hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            aria-label={t('meridian.inbox.next', {}, { defaultValue: 'Next' })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 6), 'overflow-y-auto')}>
        <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.flex({ direction: 'col', gap: 'md' }))}>
          <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 2))}>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'text-on-surface leading-tight',
              )}
              data-mol-id="reading-subject"
            >
              {email.subject || t('meridian.inbox.noSubject', {}, { defaultValue: '(no subject)' })}
            </h1>
            {labelChips.length > 0 && (
              <div className={cm.flex({ gap: 'xs', wrap: 'wrap' })}>
                {labelChips.map((l) => (
                  <span
                    key={l.name}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'text-[10px] py-1 uppercase tracking-widest bg-primary/10 text-primary-dark',
                    )}
                    style={{ color: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            )}
          </header>

          <MeridianMessageCard
            contextLine={formatRelativeTimestamp(email.sent_at ?? email.created_at)}
            message={{
              sender: senderName.replace(/\b\w/g, (c) => c.toUpperCase()),
              senderEmail,
              initials,
              recipients: recipientsList,
              timestamp: formatRelativeTimestamp(email.sent_at ?? email.created_at),
              body: (email.body || '').split(/\n+/).filter(Boolean),
              attachments: (email.attachments ?? undefined)?.map((a) => ({
                name: a.name,
                sizeLabel: a.size_label ?? '',
                icon: 'description',
                tone: 'doc',
              })),
            }}
          />

          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'rounded-2xl border border-outline-variant/40 bg-surface shadow-sm overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
            data-mol-id="reading-quick-reply"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'border-b border-outline-variant/40 bg-surface-container-lowest text-sm font-medium text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                reply
              </span>
              {t(
                'meridian.inbox.replyTo',
                { name: senderName },
                { defaultValue: 'Reply to {{name}}' },
              )}
            </div>
            <textarea
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t(
                'meridian.inbox.replyPlaceholder',
                {},
                { defaultValue: 'Write a reply…' },
              )}
              data-mol-id="reading-reply-textarea"
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 4),
                cm.textSize('sm'),
                'border-none outline-none resize-none bg-transparent placeholder:text-on-surface-variant focus:ring-0',
              )}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'border-t border-outline-variant/40 bg-surface',
              )}
            >
              <div
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                data-mol-id="reading-reply-feedback"
              >
                {feedback}
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <Link
                  to={`/thread/${email.id}`}
                  data-mol-id="reading-open-thread"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    forum
                  </span>
                  {t('meridian.inbox.viewThread', {}, { defaultValue: 'View thread' })}
                </Link>
                <Link
                  to={`/compose?reply=${email.id}`}
                  data-mol-id="reading-open-compose"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-full border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    open_in_new
                  </span>
                  {t('meridian.inbox.openCompose', {}, { defaultValue: 'Open compose' })}
                </Link>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  data-mol-id="reading-send-reply"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow',
                  )}
                >
                  {sending
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t('common.send', {}, { defaultValue: 'Send' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    send
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Inbox
