import { useCallback, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

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
import { useEmails, useLabels } from '../lib/useEmails.js'
import { useIsMobile } from '../lib/useIsMobile.js'

interface FolderViewProps {
  folder: 'sent' | 'archive' | 'trash' | 'spam'
  /** Translated heading text. */
  heading: string
  /** Empty-state copy. */
  emptyMessage: string
}

export function FolderView({ folder, heading, emptyMessage }: FolderViewProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const isMobile = useIsMobile()
  const { emails, loading, error, refetch, setEmails } = useEmails({
    folder,
    refreshKey,
    limit: 200,
  })
  const { labels } = useLabels()
  const labelsById = useMemo<Record<string, EmailLabel>>(() => {
    const out: Record<string, EmailLabel> = {}
    for (const l of labels) out[l.id] = l
    return out
  }, [labels])

  // Desktop keeps a default selection; mobile collapses to list → detail
  // (list stays full-width until a row is tapped).
  const selected: EmailRow | null = useMemo(() => {
    if (isMobile) return (emails.find((e) => e.id === selectedId) ?? null) as EmailRow | null
    return (emails.find((e) => e.id === selectedId) ?? emails[0] ?? null) as EmailRow | null
  }, [emails, selectedId, isMobile])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    void refetch()
  }, [refetch])

  const restoreToInbox = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      setSelectedId(null)
      try {
        await http.put(`/api/emails/${id}/move`, { folder: 'inbox' })
        track({ name: 'folder.moved', properties: { email_id: id, folder: 'inbox' } })
      } finally {
        refresh()
      }
    },
    [http, setEmails, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      setSelectedId(null)
      try {
        await http.delete(`/api/emails/${id}`)
        track({
          name: 'email.deleted',
          properties: { email_id: id, permanent: folder === 'trash' },
        })
      } finally {
        refresh()
      }
    },
    [http, setEmails, refresh, folder],
  )

  return (
    <MeridianAppShell refreshKey={refreshKey}>
      <div className={cm.cn(cm.flex({}), 'h-full overflow-hidden')} data-mol-id={`page-${folder}`}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            isMobile
              ? selected
                ? 'hidden'
                : cm.w('full')
              : 'w-[400px] shrink-0 border-r border-outline-variant/40',
            'bg-surface',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'border-b border-outline-variant/40 bg-surface-container-lowest',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {heading}
            </h2>
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              data-mol-id={`${folder}-count`}
            >
              {t(
                'meridian.folder.count',
                { count: emails.length },
                { defaultValue: '{{count}} messages' },
              )}
            </span>
          </header>
          <div className={cm.cn(cm.flex1, 'overflow-y-auto')} data-mol-id={`${folder}-list`}>
            {loading && (
              <div className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </div>
            )}
            {!loading && error && (
              <div className={cm.cn(cm.sp('p', 6), 'text-error text-sm')}>{error}</div>
            )}
            {!loading && emails.length === 0 && (
              <div
                className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}
                data-mol-id={`${folder}-empty`}
              >
                {emptyMessage}
              </div>
            )}
            {emails.map((row) => (
              <MeridianThreadRow
                key={row.id}
                thread={emailToThreadRow(row, labelsById)}
                active={row.id === selected?.id}
                onClick={() => setSelectedId(row.id)}
              />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.flex1,
            isMobile && !selected && 'hidden',
            'min-w-0 bg-surface-container-lowest',
          )}
        >
          {selected ? (
            <>
              <header
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 6),
                  'h-14 border-b border-outline-variant/40 bg-surface shrink-0',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'text-on-surface-variant',
                  )}
                >
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      data-mol-id={`${folder}-back`}
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
                  {(folder === 'archive' || folder === 'trash' || folder === 'spam') && (
                    <button
                      type="button"
                      onClick={() => restoreToInbox(selected.id)}
                      data-mol-id={`${folder}-restore`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'rounded-full bg-primary/10 text-primary-dark hover:bg-primary/20 transition-colors',
                      )}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        unarchive
                      </span>
                      {t('meridian.folder.restore', {}, { defaultValue: 'Move to inbox' })}
                    </button>
                  )}
                </div>
                {folder === 'trash' ? (
                  <ConfirmButton
                    label={t(
                      'meridian.folder.deleteForever',
                      {},
                      { defaultValue: 'Delete permanently' },
                    )}
                    confirmLabel={t(
                      'meridian.folder.confirmDeleteForever',
                      {},
                      { defaultValue: 'Tap again to delete forever' },
                    )}
                    aria-label={t(
                      'meridian.folder.delete',
                      {},
                      { defaultValue: 'Permanently delete' },
                    )}
                    onConfirm={() => remove(selected.id)}
                    disarmSeconds={6}
                    color="error"
                    data-mol-id={`${folder}-delete`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(selected.id)}
                    data-mol-id={`${folder}-delete`}
                    aria-label={t('meridian.folder.delete', {}, { defaultValue: 'Delete' })}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-full text-error hover:bg-error/10 transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      delete
                    </span>
                    {t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                )}
              </header>

              <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 6), 'overflow-y-auto')}>
                <div
                  className={cm.cn(
                    cm.maxW('4xl'),
                    cm.mxAuto,
                    cm.flex({ direction: 'col', gap: 'md' }),
                  )}
                >
                  <header
                    className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 2))}
                  >
                    <h1
                      className={cm.cn(
                        'text-2xl font-bold tracking-tight text-on-surface leading-tight',
                      )}
                      data-mol-id={`${folder}-subject`}
                    >
                      {selected.subject ||
                        t('meridian.inbox.noSubject', {}, { defaultValue: '(no subject)' })}
                    </h1>
                  </header>
                  <MeridianMessageCard
                    contextLine={formatRelativeTimestamp(selected.sent_at ?? selected.created_at)}
                    message={{
                      sender:
                        selected.from
                          .split('@')[0]
                          ?.replace(/[._-]+/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase()) ?? selected.from,
                      senderEmail: selected.from,
                      initials: deriveInitials(selected.from),
                      recipients: ensureArray(selected.to).join(', '),
                      timestamp: formatRelativeTimestamp(selected.sent_at ?? selected.created_at),
                      body: (selected.body || '').split(/\n+/).filter(Boolean),
                      attachments: (selected.attachments ?? undefined)?.map((a) => ({
                        name: a.name,
                        sizeLabel: a.size_label ?? '',
                        icon: 'description',
                        tone: 'doc',
                      })),
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-full text-on-surface-variant',
              )}
            >
              {emptyMessage}
            </div>
          )}
        </section>
      </div>
    </MeridianAppShell>
  )
}

export function Sent() {
  const { t } = useTranslation()
  return (
    <FolderView
      folder="sent"
      heading={t('meridian.sent.title', {}, { defaultValue: 'Sent' })}
      emptyMessage={t(
        'meridian.sent.empty',
        {},
        { defaultValue: 'You haven\u2019t sent anything yet.' },
      )}
    />
  )
}

export function Archive() {
  const { t } = useTranslation()
  return (
    <FolderView
      folder="archive"
      heading={t('common.archive', {}, { defaultValue: 'Archive' })}
      emptyMessage={t('meridian.archive.empty', {}, { defaultValue: 'Archive is empty.' })}
    />
  )
}

export function Trash() {
  const { t } = useTranslation()
  return (
    <FolderView
      folder="trash"
      heading={t('meridian.trash.title', {}, { defaultValue: 'Trash' })}
      emptyMessage={t('meridian.trash.empty', {}, { defaultValue: 'Trash is empty.' })}
    />
  )
}

export function Spam() {
  const { t } = useTranslation()
  return (
    <FolderView
      folder="spam"
      heading={t('meridian.spam.title', {}, { defaultValue: 'Spam' })}
      emptyMessage={t('meridian.spam.empty', {}, { defaultValue: 'No spam.' })}
    />
  )
}

export default FolderView
