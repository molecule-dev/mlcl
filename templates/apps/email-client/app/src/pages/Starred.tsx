import { useCallback, useMemo, useState } from 'react'

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
import { useEmails, useLabels } from '../lib/useEmails.js'

const FILTERS = [
  { key: 'all', defaultLabel: 'All starred', maxAgeDays: null },
  { key: 'week', defaultLabel: 'This week', maxAgeDays: 7 },
  { key: 'month', defaultLabel: 'Last month', maxAgeDays: 30 },
  { key: 'year', defaultLabel: 'This year', maxAgeDays: 365 },
] as const

export function Starred() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { emails, loading, error, refetch, setEmails } = useEmails({
    is_starred: true,
    refreshKey,
    limit: 200,
  })
  const { labels } = useLabels()
  const labelsById: Record<string, EmailLabel> = useMemo(() => {
    const out: Record<string, EmailLabel> = {}
    for (const l of labels) out[l.id] = l
    return out
  }, [labels])

  const filtered = useMemo(() => {
    const cutoff = FILTERS.find((f) => f.key === filter)?.maxAgeDays
    if (!cutoff) return emails
    const ms = Date.now() - cutoff * 24 * 60 * 60 * 1000
    return emails.filter((e) => new Date(e.sent_at ?? e.created_at).getTime() >= ms)
  }, [emails, filter])

  const selected: EmailRow | null = useMemo(() => {
    return (filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null) as EmailRow | null
  }, [filtered, selectedId])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    void refetch()
  }, [refetch])

  const unstar = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      try {
        await http.put(`/api/emails/${id}/star`)
      } finally {
        refresh()
      }
    },
    [http, setEmails, refresh],
  )

  const archive = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      try {
        await http.put(`/api/emails/${id}/move`, { folder: 'archive' })
      } finally {
        refresh()
      }
    },
    [http, setEmails, refresh],
  )

  const trash = useCallback(
    async (id: string) => {
      setEmails((curr) => curr.filter((e) => e.id !== id))
      try {
        await http.delete(`/api/emails/${id}`)
      } finally {
        refresh()
      }
    },
    [http, setEmails, refresh],
  )

  return (
    <MeridianAppShell refreshKey={refreshKey}>
      <div className={cm.cn(cm.flex({}), 'h-full overflow-hidden')} data-mol-id="page-starred">
        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'w-[400px] shrink-0 border-r border-outline-variant/40 bg-surface',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'border-b border-outline-variant/40 bg-surface-container-lowest sticky top-0 z-10',
            )}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('status.starred', {}, { defaultValue: 'Starred' })}
              </h2>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
                data-mol-id="starred-count"
              >
                {t(
                  'meridian.starred.total',
                  { count: emails.length },
                  { defaultValue: '{{count}} total' },
                )}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ gap: 'xs' }), 'overflow-x-auto')}>
              {FILTERS.map((f) => {
                const active = filter === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    data-mol-id={`starred-filter-${f.key}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight(active ? 'bold' : 'medium'),
                      cm.textSize('xs'),
                      cm.cursorPointer,
                      'rounded-full whitespace-nowrap transition-colors',
                      active
                        ? 'bg-primary text-white'
                        : 'bg-surface text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-low',
                    )}
                  >
                    {t(`meridian.starred.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
                  </button>
                )
              })}
            </div>
          </header>
          <div className={cm.cn(cm.flex1, 'overflow-y-auto')} data-mol-id="starred-list">
            {loading && (
              <div className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}>
                {t('meridian.starred.loading', {}, { defaultValue: 'Loading…' })}
              </div>
            )}
            {!loading && error && (
              <div className={cm.cn(cm.sp('p', 6), 'text-error text-sm')}>{error}</div>
            )}
            {!loading && filtered.length === 0 && (
              <div
                className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}
                data-mol-id="starred-empty"
              >
                {t('meridian.starred.empty', {}, { defaultValue: 'No starred messages.' })}
              </div>
            )}
            {filtered.map((s) => (
              <MeridianThreadRow
                key={s.id}
                thread={emailToThreadRow(s, labelsById)}
                active={s.id === selected?.id}
                onClick={() => setSelectedId(s.id)}
                onToggleStar={() => unstar(s.id)}
              />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.flex1,
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
                  <button
                    type="button"
                    onClick={() => archive(selected.id)}
                    data-mol-id="starred-archive"
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
                    onClick={() => trash(selected.id)}
                    data-mol-id="starred-delete"
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
                </div>
                <button
                  type="button"
                  onClick={() => unstar(selected.id)}
                  data-mol-id="starred-unstar"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full bg-warning-light text-warning border border-warning/30 hover:bg-warning/20 transition-colors',
                  )}
                >
                  <span
                    className={'material-symbols-outlined text-base'}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    star
                  </span>
                  {t('meridian.starred.removeStar', {}, { defaultValue: 'Remove star' })}
                </button>
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
                      data-mol-id="starred-subject"
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
              {t(
                'meridian.starred.selectMessage',
                {},
                { defaultValue: 'Select a starred message.' },
              )}
            </div>
          )}
        </section>
      </div>
    </MeridianAppShell>
  )
}

export default Starred
