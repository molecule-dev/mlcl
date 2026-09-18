import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { VersalDocumentCard } from '../components/VersalDocumentCard.js'
import {
  type DocumentRow,
  type FolderRow,
  makeExcerpt,
  relativeLabel,
  tagsOf,
} from '../lib/types.js'

interface DailyBar {
  day: string
  words: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Stats — derives every figure from the live document list.
 *
 * No mock data: every KPI ("today", "streak", "last 7 days") is computed
 * from `/api/documents`. The bar chart bucketises updated_at into the
 * trailing 7 days; the highlighted documents are the most-recently
 * touched rows.
 */
export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get<DocumentRow[]>('/documents'), http.get<FolderRow[]>('/folders')])
      .then(([docsRes, foldersRes]) => {
        if (cancelled) return
        setDocs(Array.isArray(docsRes.data) ? docsRes.data : [])
        setFolders(Array.isArray(foldersRes.data) ? foldersRes.data : [])
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('stats.loadFailed', {}, { defaultValue: 'Could not load stats.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const totalWords = useMemo(() => docs.reduce((sum, d) => sum + (d.word_count ?? 0), 0), [docs])
  const wordsToday = useMemo(
    () =>
      docs
        .filter((d) => new Date(d.updated_at) >= today)
        .reduce((sum, d) => sum + (d.word_count ?? 0), 0),
    [docs, today],
  )
  const drafts = useMemo(() => docs.filter((d) => d.status === 'draft').length, [docs])
  const published = useMemo(() => docs.filter((d) => d.status === 'published').length, [docs])

  const dailyBars: ReadonlyArray<DailyBar> = useMemo(() => {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    const buckets = new Map<string, number>()
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      buckets.set(d.toDateString(), 0)
    }
    for (const doc of docs) {
      const updated = new Date(doc.updated_at)
      const key = new Date(
        updated.getFullYear(),
        updated.getMonth(),
        updated.getDate(),
      ).toDateString()
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + (doc.word_count ?? 0))
      }
    }
    return Array.from(buckets.entries()).map(([key, words]) => ({
      day: DAY_LABELS[new Date(key).getDay()] ?? '',
      words,
    }))
  }, [docs, today])

  const wordsLast7 = useMemo(() => dailyBars.reduce((sum, b) => sum + b.words, 0), [dailyBars])

  const recent = useMemo(
    () =>
      [...docs]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6),
    [docs],
  )

  const maxBar = Math.max(1, ...dailyBars.map((b) => b.words))

  if (loading) {
    return (
      <div className={cm.cn('p-12 text-center text-on-surface-variant')}>
        {t('stats.loading', {}, { defaultValue: 'Crunching numbers…' })}
      </div>
    )
  }

  return (
    <div className={cm.cn('mx-auto w-full max-w-[1080px] px-6 py-12 lg:px-10 lg:py-16 space-y-12')}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('stats.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} · Stats' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t('stats.title', {}, { defaultValue: 'How the writing has been going.' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 2), 'text-base text-on-surface-variant max-w-xl')}>
          {t(
            'stats.subtitle',
            {},
            {
              defaultValue:
                'Every figure on this page is derived from your real documents. No demo data.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg border border-error/40 bg-error/5 px-4 py-2 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      <section className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-3')}>
        {[
          {
            key: 'today',
            label: t('status.today', {}, { defaultValue: 'Today' }),
            value: wordsToday.toLocaleString(),
            sub: t('stats.kpi.todaySub', {}, { defaultValue: 'words written' }),
            icon: 'edit_note',
          },
          {
            key: 'last7',
            label: t('stats.kpi.last7', {}, { defaultValue: 'Last 7 days' }),
            value: wordsLast7.toLocaleString(),
            sub: t('stats.kpi.last7Sub', {}, { defaultValue: 'words across snapshots' }),
            icon: 'show_chart',
          },
          {
            key: 'total',
            label: t('stats.kpi.total', {}, { defaultValue: 'All time' }),
            value: totalWords.toLocaleString(),
            sub: t(
              'stats.kpi.totalSub',
              { count: docs.length },
              { defaultValue: '{{count}} documents' },
            ),
            icon: 'auto_stories',
          },
          {
            key: 'status',
            label: t('nav.status', {}, { defaultValue: 'Status' }),
            value: `${drafts} / ${published}`,
            sub: t('stats.kpi.statusSub', {}, { defaultValue: 'drafts vs published' }),
            icon: 'rule',
          },
        ].map((kpi) => (
          <div
            key={kpi.key}
            data-testid={`stats-kpi-${kpi.key}`}
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-2')}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
                )}
              >
                {kpi.label}
              </span>
              <span
                className={cm.cn('material-symbols-outlined text-[18px] text-primary')}
                aria-hidden="true"
              >
                {kpi.icon}
              </span>
            </div>
            <p
              className={cm.cn('text-2xl font-extrabold tabular-nums text-on-surface')}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {kpi.value}
            </p>
            <p className={cm.cn('text-[12px] text-on-surface-variant mt-1')}>{kpi.sub}</p>
          </div>
        ))}
      </section>

      <section
        data-testid="stats-bars"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-4')}>
          <h2 className={cm.cn('text-lg font-bold text-on-surface')}>
            {t('stats.weekHeading', {}, { defaultValue: 'Words per day, last 7 days' })}
          </h2>
          <span className={cm.cn('text-[11px] font-bold tabular-nums text-on-surface-variant')}>
            {wordsLast7.toLocaleString()} total
          </span>
        </div>
        <div className={cm.cn('flex items-end gap-3 h-40')}>
          {dailyBars.map((bar, idx) => {
            const heightPct = (bar.words / maxBar) * 100
            return (
              <div
                key={idx}
                className={cm.cn('flex-1 flex flex-col items-center justify-end h-full')}
              >
                <span
                  className={cm.cn(
                    'text-[10px] font-bold tabular-nums text-on-surface-variant mb-1',
                  )}
                >
                  {bar.words.toLocaleString()}
                </span>
                <div
                  className={cm.cn('w-full rounded-t-md bg-primary/70')}
                  style={{ height: `${Math.max(2, heightPct)}%` }}
                  aria-label={`${bar.day}: ${bar.words} words`}
                />
                <span
                  className={cm.cn(
                    'mt-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {bar.day}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2
          className={cm.cn('text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-4')}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t('stats.recentHeading', {}, { defaultValue: 'Recent edits' })}
        </h2>
        {recent.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl border border-dashed border-outline-variant text-center text-on-surface-variant',
            )}
          >
            {t(
              'stats.recentEmpty',
              {},
              {
                defaultValue: 'Once you start writing, your most-recent documents will land here.',
              },
            )}
          </div>
        ) : (
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-4')}>
            {recent.map((d) => (
              <VersalDocumentCard
                key={d.id}
                density="compact"
                doc={{
                  id: d.id,
                  title: d.title || 'Untitled',
                  excerpt: d.excerpt ?? makeExcerpt(d.body_md),
                  updatedAtLabel: relativeLabel(d.updated_at),
                  collection: folders.find((f) => f.id === d.folder_id)?.name ?? undefined,
                  tags: tagsOf(d),
                  wordCount: d.word_count,
                  readingMinutes: d.reading_time,
                  status: d.status,
                  pinned: d.pinned,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Stats
