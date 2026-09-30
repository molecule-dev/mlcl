import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { InboxEmail } from '../components/EmailListItem.js'
import { EmailListItem } from '../components/EmailListItem.js'
import { StatusPill } from '../components/StatusPill.js'

interface DraftRow {
  id: string
  subject: string
  body: string
  status: string
  recipients: unknown
  cc?: unknown
  bcc?: unknown
  ai_generated?: boolean
  scheduled_at?: string | null
  sent_at?: string | null
  archived_at?: string | null
  updated_at?: string
  created_at?: string
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
  status: string
  created_at?: string
  updated_at?: string
  opened_at?: string | null
  clicked_at?: string | null
  bounced_at?: string | null
  archived_at?: string | null
}

type FolderKey = 'inbox' | 'starred' | 'drafts' | 'scheduled' | 'sent' | 'archive'

// Design filter chips (All / Unread / AI-Drafted) — client-side filters on the
// active folder's items.
type ListFilter = 'all' | 'unread' | 'ai'

const LIST_FILTERS: ReadonlyArray<{ key: ListFilter; defaultLabel: string; icon?: string }> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'unread', defaultLabel: 'Unread' },
  { key: 'ai', defaultLabel: 'AI-Drafted', icon: 'auto_awesome' },
]

const FOLDERS: ReadonlyArray<{ key: FolderKey; defaultLabel: string; icon: string }> = [
  { key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { key: 'starred', defaultLabel: 'Starred', icon: 'star' },
  { key: 'drafts', defaultLabel: 'Drafts', icon: 'drafts' },
  { key: 'scheduled', defaultLabel: 'Scheduled', icon: 'schedule' },
  { key: 'sent', defaultLabel: 'Sent', icon: 'send' },
  { key: 'archive', defaultLabel: 'Archive', icon: 'archive' },
]

const STATUS_LABELS = {
  sent: 'Sent',
  draft: 'Draft',
  scheduled: 'Scheduled',
  bounced: 'Bounced',
  opened: 'Opened',
  replied: 'Replied',
  delivered: 'Delivered',
  'ai-generated': 'AI Drafted',
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
    } catch (_error) {
      // JSON.parse failed — value is not a JSON array; fall back to empty list
      return []
    }
  }
  return []
}

function senderFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return (
    local
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || email
  )
}

function statusToPill(status: string): InboxEmail['status'] {
  const normalized = status?.toLowerCase()
  if (normalized === 'opened' || normalized === 'clicked') return 'opened'
  if (normalized === 'bounced' || normalized === 'failed') return 'bounced'
  if (normalized === 'scheduled') return 'scheduled'
  if (normalized === 'draft') return 'draft'
  if (normalized === 'replied') return 'replied'
  if (normalized === 'delivered') return 'delivered'
  return 'sent'
}

export function Inbox() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [params, setParams] = useSearchParams()

  const folderParam = (params.get('folder') as FolderKey | null) ?? 'inbox'
  const [activeFolder, setActiveFolder] = useState<FolderKey>(folderParam)
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [sent, setSent] = useState<SentRow[]>([])
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveFolder(folderParam)
  }, [folderParam])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [draftsResp, sentResp] = await Promise.all([
          http.get<DraftRow[] | { data: DraftRow[] }>('/drafts'),
          http.get<SentRow[] | { data: SentRow[] }>('/sent-emails'),
        ])
        if (cancelled) return
        const draftRows = Array.isArray(draftsResp.data)
          ? draftsResp.data
          : (draftsResp.data.data ?? [])
        const sentRows = Array.isArray(sentResp.data) ? sentResp.data : (sentResp.data.data ?? [])
        setDrafts(draftRows)
        setSent(sentRows)
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load mail'
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const allFolderItems = useMemo<InboxEmail[]>(() => {
    if (activeFolder === 'drafts') {
      return drafts
        .filter((d) => d.status === 'draft' && !d.archived_at)
        .map((d) => {
          const recipients = parseList(d.recipients)
          return {
            id: d.id,
            sender_name: t('inbox.draftLabel', {}, { defaultValue: 'Draft' }),
            sender_email: recipients[0] ?? '',
            subject: d.subject || t('inbox.untitled', {}, { defaultValue: '(no subject)' }),
            snippet: d.body?.slice(0, 160) || '',
            received_at: d.updated_at ?? d.created_at ?? new Date().toISOString(),
            status: 'draft',
            unread: false,
            ai_generated: d.ai_generated,
          }
        })
    }
    if (activeFolder === 'scheduled') {
      return drafts
        .filter((d) => d.status === 'scheduled' && !d.archived_at)
        .map((d) => {
          const recipients = parseList(d.recipients)
          return {
            id: d.id,
            sender_name: t('inbox.scheduledLabel', {}, { defaultValue: 'Scheduled' }),
            sender_email: recipients[0] ?? '',
            subject: d.subject || t('inbox.untitled', {}, { defaultValue: '(no subject)' }),
            snippet: d.body?.slice(0, 160) || '',
            received_at: d.scheduled_at ?? d.updated_at ?? d.created_at ?? new Date().toISOString(),
            status: 'scheduled',
            unread: false,
          }
        })
    }
    if (activeFolder === 'archive') {
      // Archive surfaces both archived drafts AND archived sent_emails so
      // anything the user has explicitly archived stays accessible until
      // they un-archive (or delete) it. Both are persisted server-side via
      // POST /drafts/:id/archive and POST /sent-emails/:id/archive.
      const archivedDrafts = drafts.filter((d) => Boolean(d.archived_at))
      const archivedSent = sent.filter((s) => Boolean(s.archived_at))
      return [
        ...archivedDrafts.map((d) => ({
          id: d.id,
          sender_name: senderFromEmail(parseList(d.recipients)[0] ?? ''),
          sender_email: parseList(d.recipients)[0] ?? '',
          subject: d.subject || t('inbox.untitled', {}, { defaultValue: '(no subject)' }),
          snippet: d.body?.slice(0, 160) || '',
          received_at: d.archived_at ?? d.sent_at ?? d.updated_at ?? new Date().toISOString(),
          status: statusToPill(d.status),
          unread: false,
        })),
        ...archivedSent.map((s) => {
          const draft = drafts.find((d) => d.id === s.draft_id)
          return {
            id: s.id,
            sender_name: senderFromEmail(s.recipient_email),
            sender_email: s.recipient_email,
            subject: draft?.subject ?? t('inbox.untitled', {}, { defaultValue: '(no subject)' }),
            snippet: draft?.body?.slice(0, 160) ?? '',
            received_at: s.archived_at ?? s.updated_at ?? new Date().toISOString(),
            status: statusToPill(s.status),
            unread: false,
          }
        }),
      ]
    }
    if (activeFolder === 'starred') {
      // "Starred" surfaces emails with status === 'replied' — we read this
      // as "noteworthy: someone replied to it." When a real `starred_at`
      // column ships this branch will switch to that field.
      return sent
        .filter((s) => s.status === 'replied' && !s.archived_at)
        .map((s) => {
          const draft = drafts.find((d) => d.id === s.draft_id)
          return {
            id: s.id,
            sender_name: senderFromEmail(s.recipient_email),
            sender_email: s.recipient_email,
            subject: draft?.subject ?? t('inbox.untitled', {}, { defaultValue: '(no subject)' }),
            snippet: draft?.body?.slice(0, 160) ?? '',
            received_at: s.updated_at ?? s.created_at ?? new Date().toISOString(),
            status: 'replied',
            unread: false,
          }
        })
    }
    // sent + inbox both surface sent_emails
    return sent
      .filter((s) => !s.archived_at)
      .map((s) => {
        const draft = drafts.find((d) => d.id === s.draft_id)
        return {
          id: s.id,
          sender_name: senderFromEmail(s.recipient_email),
          sender_email: s.recipient_email,
          subject: draft?.subject ?? t('inbox.untitled', {}, { defaultValue: '(no subject)' }),
          snippet: draft?.body?.slice(0, 160) ?? '',
          received_at: s.updated_at ?? s.created_at ?? new Date().toISOString(),
          status: statusToPill(s.status),
          unread: s.status === 'sent' || s.status === 'delivered',
          ai_generated: draft?.ai_generated,
        }
      })
  }, [activeFolder, drafts, sent, t])

  const folderItems = useMemo<InboxEmail[]>(() => {
    if (listFilter === 'unread') return allFolderItems.filter((e) => e.unread)
    if (listFilter === 'ai') return allFolderItems.filter((e) => Boolean(e.ai_generated))
    return allFolderItems
  }, [allFolderItems, listFilter])

  const folderCounts = useMemo<Record<FolderKey, number>>(() => {
    const draftsCount = drafts.filter((d) => d.status === 'draft' && !d.archived_at).length
    const scheduledCount = drafts.filter((d) => d.status === 'scheduled' && !d.archived_at).length
    const liveSent = sent.filter((s) => !s.archived_at)
    const sentCount = liveSent.length
    const archiveCount =
      drafts.filter((d) => d.archived_at).length + sent.filter((s) => s.archived_at).length
    const starredCount = liveSent.filter((s) => s.status === 'replied').length
    return {
      inbox: sentCount,
      starred: starredCount,
      drafts: draftsCount,
      scheduled: scheduledCount,
      sent: sentCount,
      archive: archiveCount,
    }
  }, [drafts, sent])

  const selected = useMemo(
    () => folderItems.find((e) => e.id === selectedId) ?? folderItems[0] ?? null,
    [folderItems, selectedId],
  )

  useEffect(() => {
    if (folderItems.length > 0 && !folderItems.find((e) => e.id === selectedId)) {
      setSelectedId(folderItems[0].id)
    }
  }, [folderItems, selectedId])

  const handleArchive = async (id: string): Promise<void> => {
    if (archiveBusy) return
    // The same id space is shared between drafts and sent_emails (UUIDs),
    // so we look up the row in our local cache first to know which
    // collection to POST to. Optimistic update then refresh.
    const isDraft = drafts.some((d) => d.id === id)
    const isSent = sent.some((s) => s.id === id)
    if (!isDraft && !isSent) return
    const isArchiving = !(
      (isDraft && drafts.find((d) => d.id === id)?.archived_at) ||
      (isSent && sent.find((s) => s.id === id)?.archived_at)
    )
    setArchiveBusy(true)
    try {
      const path = isDraft ? `/drafts/${id}/archive` : `/sent-emails/${id}/archive`
      await http.post(path, { archived: isArchiving })
      void track({
        name: isArchiving ? 'email.archived' : 'email.unarchived',
        properties: { email_id: id, kind: isDraft ? 'draft' : 'sent' },
      })
      const stamp = isArchiving ? new Date().toISOString() : null
      if (isDraft) {
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, archived_at: stamp } : d)))
      } else {
        setSent((prev) => prev.map((s) => (s.id === id ? { ...s, archived_at: stamp } : s)))
      }
    } finally {
      setArchiveBusy(false)
    }
  }

  const handleReply = (id: string) => {
    if (activeFolder === 'drafts' || activeFolder === 'scheduled') {
      navigate(`/compose?draft=${id}`)
    } else {
      navigate(`/compose?reply=${id}`)
    }
  }

  const handleForward = (id: string) => {
    navigate(`/compose?forward=${id}`)
  }

  const switchFolder = (key: FolderKey) => {
    setActiveFolder(key)
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('folder', key)
      return next
    })
    setSelectedId(null)
  }

  return (
    <div
      data-mol-id="inbox-page"
      className={cm.cn(cm.flex({}), 'flex-col md:flex-row bg-background md:h-[calc(100vh-4rem)]')}
    >
      {/* Folder chips — mobile only; the vertical aside takes over ≥md */}
      <div
        data-mol-id="inbox-folder-chips"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'md:hidden overflow-x-auto border-b border-outline-variant/50 bg-surface',
        )}
      >
        {FOLDERS.map((folder) => {
          const active = folder.key === activeFolder
          const count = folderCounts[folder.key]
          return (
            <button
              key={folder.key}
              type="button"
              data-mol-id={`inbox-folder-chip-${folder.key}`}
              onClick={() => switchFolder(folder.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'whitespace-nowrap rounded-full border transition-colors',
                active
                  ? 'bg-primary/10 text-primary border-primary/40 font-bold'
                  : 'text-on-surface-variant border-outline-variant/40 font-medium',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {folder.icon}
              </span>
              {t(`inbox.folder.${folder.key}`, {}, { defaultValue: folder.defaultLabel })}
              {count > 0 && <span className="font-bold tabular-nums">{count}</span>}
            </button>
          )
        })}
      </div>

      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'hidden md:flex w-64 shrink-0 bg-surface border-r border-outline-variant/50',
        )}
      >
        <p
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('inbox.foldersHeading', {}, { defaultValue: 'Folders' })}
        </p>
        <nav className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1')}>
          {FOLDERS.map((folder) => {
            const active = folder.key === activeFolder
            const count = folderCounts[folder.key]
            return (
              <button
                key={folder.key}
                type="button"
                data-mol-id={`inbox-folder-${folder.key}`}
                onClick={() => switchFolder(folder.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low font-medium',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  aria-hidden="true"
                >
                  {folder.icon}
                </span>
                <span className={cm.cn('flex-1 text-left')}>
                  {t(`inbox.folder.${folder.key}`, {}, { defaultValue: folder.defaultLabel })}
                </span>
                {count > 0 && (
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.roundedFull,
                      'text-[10px] font-bold tabular-nums',
                      active
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'w-full md:w-96 shrink-0 border-b md:border-b-0 md:border-r border-outline-variant/50 bg-surface',
        )}
      >
        <header
          className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'border-b border-outline-variant/50')}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight')}>
            {t(`inbox.folder.${activeFolder}`, {}, { defaultValue: 'Inbox' })}
          </h2>
          <p
            data-mol-id="inbox-count"
            className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
          >
            {t(
              'inbox.itemCount',
              { count: folderItems.length },
              { defaultValue: '{{count}} item(s)' },
            )}
          </p>
          <div
            data-mol-id="inbox-filters"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 3))}
          >
            {LIST_FILTERS.map((filter) => {
              const active = filter.key === listFilter
              return (
                <button
                  key={filter.key}
                  type="button"
                  data-mol-id={`inbox-filter-${filter.key}`}
                  onClick={() => setListFilter(filter.key)}
                  aria-pressed={active}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.roundedFull,
                    'border transition-colors',
                    active
                      ? 'bg-primary text-white border-transparent font-bold'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 font-semibold hover:bg-surface-container',
                  )}
                >
                  {filter.icon && (
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      {filter.icon}
                    </span>
                  )}
                  {t(`inbox.filter.${filter.key}`, {}, { defaultValue: filter.defaultLabel })}
                </button>
              )
            })}
          </div>
        </header>
        <div className={cm.cn('flex-1 overflow-y-auto divide-y divide-outline-variant/40')}>
          {loading ? (
            <p
              data-mol-id="inbox-loading"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 6),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('inbox.loading', {}, { defaultValue: 'Loading mail…' })}
            </p>
          ) : error ? (
            <p
              data-mol-id="inbox-error"
              role="alert"
              className={cm.cn(cm.sp('px', 5), cm.sp('py', 6), cm.textSize('sm'), 'text-on-error')}
            >
              {error}
            </p>
          ) : folderItems.length === 0 ? (
            <p
              data-mol-id="inbox-empty"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'inbox.empty',
                {},
                {
                  defaultValue: 'Nothing here yet — your sent and drafted emails will appear here.',
                },
              )}
            </p>
          ) : (
            folderItems.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                selected={email.id === selected?.id}
                onSelect={(e) => setSelectedId(e.id)}
                statusLabel={t(
                  `inbox.status.${email.status}`,
                  {},
                  { defaultValue: STATUS_LABELS[email.status] },
                )}
              />
            ))
          )}
        </div>
      </section>

      <section className={cm.cn('flex-1 min-w-0 overflow-y-auto')}>
        {selected ? (
          <article
            data-mol-id="inbox-reading-pane"
            className={cm.cn('p-4 md:p-8', cm.maxW('4xl'), 'mx-auto w-full')}
          >
            <header
              className={cm.cn(
                cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
                cm.sp('mb', 6),
              )}
            >
              <div>
                <h1
                  data-mol-id="inbox-subject"
                  className={cm.cn('text-3xl font-extrabold tracking-tight leading-tight')}
                  style={{ fontFamily: 'Newsreader, Georgia, serif' }}
                >
                  {selected.subject}
                </h1>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {t(
                    'inbox.fromLine',
                    { name: selected.sender_name, email: selected.sender_email },
                    { defaultValue: 'From {{name}} · {{email}}' },
                  )}
                </p>
              </div>
              <StatusPill
                status={selected.status}
                label={t(
                  `inbox.status.${selected.status}`,
                  {},
                  { defaultValue: STATUS_LABELS[selected.status] },
                )}
              />
            </header>
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 leading-relaxed',
              )}
              style={{ fontFamily: 'Newsreader, Georgia, serif', lineHeight: 1.75 }}
            >
              <p className={cm.cn('whitespace-pre-wrap')}>
                {selected.snippet ||
                  t('inbox.bodyPlaceholder', {}, { defaultValue: '(no body content)' })}
              </p>
            </div>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap', cm.sp('mt', 6))}>
              <button
                type="button"
                data-mol-id="inbox-reply"
                onClick={() => handleReply(selected.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl text-white transition-all hover:shadow-md',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  reply
                </span>
                {activeFolder === 'drafts' || activeFolder === 'scheduled'
                  ? t('inbox.editCta', {}, { defaultValue: 'Edit draft' })
                  : t(
                      'inbox.replyCta',
                      { app: APP_NAME },
                      { defaultValue: `Reply with ${APP_NAME}` },
                    )}
              </button>
              <button
                type="button"
                data-mol-id="inbox-forward"
                onClick={() => handleForward(selected.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl border border-outline hover:bg-surface-container-low transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  forward
                </span>
                {t('inbox.forward', {}, { defaultValue: 'Forward' })}
              </button>
              <button
                type="button"
                data-mol-id="inbox-archive"
                disabled={archiveBusy}
                onClick={() => void handleArchive(selected.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  {activeFolder === 'archive' ? 'unarchive' : 'archive'}
                </span>
                {activeFolder === 'archive'
                  ? t('inbox.unarchive', {}, { defaultValue: 'Move to inbox' })
                  : t('common.archive', {}, { defaultValue: 'Archive' })}
              </button>
            </div>
          </article>
        ) : (
          <div
            data-mol-id="inbox-empty-detail"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('inbox.selectPrompt', {}, { defaultValue: 'Select an email to read' })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Inbox
export { Inbox as InboxPage }
