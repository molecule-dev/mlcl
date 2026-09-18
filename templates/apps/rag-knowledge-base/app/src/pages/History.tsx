import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RelevancePill } from '../components/RelevancePill.js'
import { unwrapList } from '../lib/unwrap.js'

interface CitationRecord {
  id?: string
  document_id?: string
  relevance?: number
}

interface QAEntryRecord {
  id: string
  question: string
  answer?: string
  answer_md?: string
  citations?: CitationRecord[]
  confidence?: number
  created_at: string
}

function relevancePct(entry: QAEntryRecord): number {
  if (entry.citations && entry.citations.length) {
    const top = Math.max(...entry.citations.map((c) => Number(c.relevance) || 0))
    return Math.max(0, Math.min(100, top))
  }
  return Math.round((Number(entry.confidence) || 0) * 100)
}

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  })
}

export function History() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<QAEntryRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/qa/history')
      .then((res) => {
        if (cancelled) return
        const data = unwrapList<QAEntryRecord>(res)
        setEntries(data)
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
          setError(t('history.error.load', {}, { defaultValue: 'Could not load history.' }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const list = useMemo(() => entries ?? [], [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) => {
      const body = (e.answer ?? e.answer_md ?? '').toLowerCase()
      return e.question.toLowerCase().includes(q) || body.includes(q)
    })
  }, [list, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('common.archive', {}, { defaultValue: 'Archive' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('history.heading', {}, { defaultValue: 'Q&A history' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'history.subheading',
            {},
            {
              defaultValue: 'Every question you asked and the cited answer that came back.',
            },
          )}
        </p>
        {error ? (
          <p
            data-testid="history-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'rounded-full bg-surface-container-low border border-outline-variant focus-within:border-primary transition-colors max-w-md',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-on-surface-variant mr-2')}
          style={{ fontSize: 18 }}
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            'history.searchPlaceholder',
            {},
            {
              defaultValue: 'Search past questions and answers\u2026',
            },
          )}
          data-testid="history-search"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'bg-transparent border-none focus:ring-0 outline-none',
          )}
        />
      </div>

      {entries === null ? (
        <p
          data-testid="history-loading"
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('history.loading', {}, { defaultValue: 'Loading history\u2026' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          data-testid="history-empty"
          className={cm.cn(
            cm.sp('py', 16),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            style={{ fontSize: 36 }}
            aria-hidden="true"
          >
            forum
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {list.length === 0
              ? t(
                  'history.empty.all',
                  {},
                  {
                    defaultValue:
                      'You haven\u2019t asked any questions yet. Visit Ask to get started.',
                  },
                )
              : t(
                  'history.empty.filtered',
                  {},
                  { defaultValue: 'No past questions match that search.' },
                )}
          </p>
        </div>
      ) : (
        <ul data-testid="history-list" className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {filtered.map((e) => {
            const body = e.answer ?? e.answer_md ?? ''
            const rel = relevancePct(e)
            const citations = e.citations ?? []
            return (
              <li
                key={e.id}
                data-testid={`history-row-${e.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
                  <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
                    <p
                      data-testid="history-question"
                      className={cm.cn(
                        cm.textSize('base'),
                        'font-semibold text-on-surface leading-snug',
                      )}
                    >
                      {e.question}
                    </p>
                    <p
                      data-testid="history-excerpt"
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant line-clamp-3 leading-relaxed whitespace-pre-line',
                      )}
                    >
                      {body || t('history.noAnswer', {}, { defaultValue: '(no answer recorded)' })}
                    </p>
                  </div>
                  <RelevancePill value={rel} />
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'tabular-nums')}>
                    <span
                      className={cm.cn('material-symbols-outlined')}
                      style={{ fontSize: 14 }}
                      aria-hidden="true"
                    >
                      schedule
                    </span>
                    {fmtClock(e.created_at)}
                  </span>
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className={cm.cn('material-symbols-outlined')}
                      style={{ fontSize: 14 }}
                      aria-hidden="true"
                    >
                      format_quote
                    </span>
                    {t(
                      'history.citations',
                      { count: citations.length },
                      {
                        defaultValue: `${citations.length} sources`,
                      },
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
