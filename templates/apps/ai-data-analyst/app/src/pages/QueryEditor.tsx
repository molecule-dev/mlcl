import { useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AskClarionBar } from '../components/AskClarionBar.js'
import { chartLinePoints } from '../lib/chart.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface QueryResult {
  question: string
  generated_sql: string
  chart_type: 'bar' | 'line' | 'scatter' | 'table'
  series: { label: string; value: number }[]
  rows: { col: string; values: (string | number)[] }[]
  insight?: string
}

const SAMPLE_QUESTIONS = [
  'Top accounts by amount in the last 90 days',
  'Month-over-month event count over the past year',
  'Anomalies in conversion rate for the last 90 days',
  'Correlation between session_duration and event_count',
] as const

const BAR_TONE = [
  'var(--chart-color-1)',
  'var(--chart-color-2)',
  'var(--chart-color-3)',
  'var(--chart-color-4)',
  'var(--chart-color-5)',
  'var(--chart-color-6)',
  'var(--color-secondary)',
  'var(--color-success)',
  'var(--color-primary)',
  'var(--color-info)',
]

export function QueryEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [result, setResult] = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function ask(prompt: string) {
    setRunning(true)
    setError(null)
    try {
      const res = await http.post('/api/queries', { prompt })
      const r = unwrapSingle<QueryResult>(res)
      if (r) {
        // Domain event: the ask-analyze funnel's success point. The chart the
        // user sees is part of this event (chart_type) — the app has no
        // separate save-chart action to hang a `chart.created` on.
        void track({
          name: 'analysis.run',
          properties: {
            chart_type: r.chart_type,
            series: r.series.length,
            rows: r.rows[0]?.values.length ?? 0,
            has_insight: Boolean(r.insight),
          },
        })
        setResult(r)
      } else
        setError(
          t(
            'queryEditor.emptyResult',
            {},
            { defaultValue: 'No answer returned. Try a different question.' },
          ),
        )
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setError(
        t(
          'queryEditor.runFailed',
          {},
          { defaultValue: 'Could not run that query. Please try again.' },
        ),
      )
    } finally {
      setRunning(false)
    }
  }

  function downloadCsv() {
    if (!result) return
    // Domain event: export is the query funnel's conversion-like step.
    void track({
      name: 'dataset.exported',
      properties: { format: 'csv', rows: result.rows[0]?.values.length ?? 0 },
    })
    const header = result.rows.map((r) => r.col).join(',')
    const lines: string[] = [header]
    const rowCount = result.rows[0]?.values.length ?? 0
    for (let i = 0; i < rowCount; i++) {
      lines.push(
        result.rows
          .map((r) => {
            const v = r.values[i]
            const s = typeof v === 'string' ? v : String(v ?? '')
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(','),
      )
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clarion-query-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function copySql() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.generated_sql)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setError(t('queryEditor.copyFailed', {}, { defaultValue: 'Could not copy to clipboard.' }))
    }
  }

  const max = result ? Math.max(...result.series.map((s) => s.value), 1) : 1
  const linePoints = result ? chartLinePoints(result.series.map((s) => s.value)) : ''

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.flex({ direction: 'col', gap: 6 }))}>
      <header className={cm.flex({ direction: 'col', gap: 1 })}>
        <p className={cm.cn('text-[10px] uppercase tracking-[0.22em] font-black text-primary')}>
          {t(
            'queryEditor.eyebrow',
            { appName: APP_NAME },
            { defaultValue: 'Ask {{appName}} · Natural-language query' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('queryEditor.heading', {}, { defaultValue: 'What do you want to know?' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 1),
            'text-on-surface-variant max-w-2xl leading-relaxed',
          )}
        >
          {t(
            'queryEditor.subhead',
            { appName: APP_NAME },
            {
              defaultValue:
                'Type a question in plain English. {{appName}} picks the chart, runs the SQL, and shows you the lineage.',
            },
          )}
        </p>
      </header>

      <AskClarionBar suggestions={SAMPLE_QUESTIONS} loading={running} onSubmit={ask} />

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-container/30 text-error text-center',
          )}
        >
          {error}
        </div>
      ) : null}

      {!result ? (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 4 }),
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-dashed border-outline-variant',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(16),
              cm.h(16),
              cm.roundedFull,
              'bg-gradient-to-br from-primary/15 to-secondary/15 text-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('3xl'))}
              aria-hidden="true"
            >
              auto_awesome
            </span>
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight text-on-surface',
            )}
          >
            {t(
              'queryEditor.emptyHeading',
              {},
              { defaultValue: 'Pick a suggestion or type your own' },
            )}
          </h2>
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md leading-relaxed')}
          >
            {t(
              'queryEditor.emptyBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} answers in three pieces: a chart, the underlying data table, and the SQL that ran.',
              },
            )}
          </p>
        </section>
      ) : (
        <>
          {/* Result hero — gradient frame containing the chart */}
          <section
            className={
              'rounded-3xl p-[1px] bg-gradient-to-br from-primary/40 via-secondary/30 to-tertiary-container/30'
            }
          >
            <article
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 5 }),
                cm.sp('p', 6),
                'rounded-[1.45rem] bg-surface-container-lowest',
              )}
            >
              <header
                className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 3 })}
              >
                <div className={cm.flex({ direction: 'col', gap: 1 })}>
                  <span
                    className={cm.cn(
                      'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface-variant',
                    )}
                  >
                    {t('queryEditor.questionEyebrow', {}, { defaultValue: 'You asked' })}
                  </span>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('semibold'),
                      'font-headline text-on-surface leading-snug',
                    )}
                  >
                    {result.question}
                  </h2>
                </div>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'bg-secondary/10 text-secondary uppercase tracking-widest',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                    aria-hidden="true"
                  >
                    auto_awesome
                  </span>
                  {t('queryEditor.aiBadge', {}, { defaultValue: 'AI generated' })}
                </span>
              </header>

              {/* Chart — honor the server-chosen chart_type (line/scatter → line, table → table,
                  otherwise a horizontal-bar list), matching the report chart surfaces. */}
              {result.chart_type === 'line' || result.chart_type === 'scatter' ? (
                <div>
                  <svg
                    viewBox="0 0 200 80"
                    preserveAspectRatio="none"
                    className={cm.cn('w-full h-48')}
                    aria-hidden="true"
                  >
                    <path
                      d={`M0,80 L${linePoints.split(' ').join(' L')} L200,80 Z`}
                      fill="var(--chart-color-1)"
                      opacity="0.12"
                    />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="var(--chart-color-1)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between' }),
                      cm.textSize('xs'),
                      cm.sp('mt', 2),
                      'text-on-surface-variant',
                    )}
                  >
                    {result.series.map((s) => (
                      <span key={s.label}>{s.label}</span>
                    ))}
                  </div>
                </div>
              ) : result.chart_type === 'table' ? (
                <div className={'overflow-x-auto'}>
                  <table className={cm.cn('w-full', cm.textSize('sm'))}>
                    <thead>
                      <tr>
                        {result.rows.map((c) => (
                          <th
                            key={c.col}
                            className={cm.cn(
                              cm.fontWeight('semibold'),
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              'text-left border-b border-outline-variant/50 text-on-surface-variant',
                            )}
                          >
                            {c.col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({
                        length: result.rows.reduce((n, c) => Math.max(n, c.values.length), 0),
                      }).map((_row, rowIndex) => (
                        <tr key={rowIndex}>
                          {result.rows.map((c) => (
                            <td
                              key={c.col}
                              className={cm.cn(
                                cm.sp('px', 3),
                                cm.sp('py', 2),
                                'border-b border-outline-variant/30 tabular-nums',
                              )}
                            >
                              {String(c.values[rowIndex] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ul className={cm.flex({ direction: 'col', gap: 3 })}>
                  {result.series.map((s, i) => (
                    <li key={s.label} className={cm.flex({ direction: 'col', gap: 1 })}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between' }),
                          cm.textSize('sm'),
                        )}
                      >
                        <span className={cm.fontWeight('medium')}>{s.label}</span>
                        <span className={cm.cn('tabular-nums font-mono text-on-surface-variant')}>
                          {s.value.toLocaleString()}
                        </span>
                      </div>
                      <div className={'h-3 rounded-full bg-surface-container overflow-hidden'}>
                        <div
                          className={'h-full rounded-full transition-all duration-500'}
                          style={{
                            width: `${(s.value / max) * 100}%`,
                            background: BAR_TONE[i % BAR_TONE.length],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {result.insight ? (
                <div
                  className={cm.cn(
                    cm.flex({ gap: 3 }),
                    cm.sp('p', 4),
                    'rounded-2xl bg-secondary/10',
                    cm.accentCard({ tone: 'custom' }),
                  )}
                  style={{ ['--mol-accent' as string]: 'var(--color-secondary)' }}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      cm.textSize('lg'),
                      'text-secondary flex-shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    auto_awesome
                  </span>
                  <div className={cm.flex({ direction: 'col', gap: 1 })}>
                    <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }))}>
                      {t('queryEditor.aiSummary', {}, { defaultValue: 'AI summary' })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface')}>
                      {result.insight}
                    </p>
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          {/* Two-column: data table + SQL */}
          <div className={cm.cn(cm.grid({ cols: 1, gap: 5 }), 'lg:grid-cols-5')}>
            <section
              className={cm.cn(
                'lg:col-span-3',
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 overflow-hidden',
              )}
            >
              <header
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'bg-surface-container border-b border-outline-variant/40',
                )}
              >
                <h3
                  className={cm.cn(
                    'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface-variant',
                  )}
                >
                  {t('queryEditor.dataHeading', {}, { defaultValue: 'Data' })}
                </h3>
                <button
                  type="button"
                  onClick={downloadCsv}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}
                    aria-hidden="true"
                  >
                    download
                  </span>
                  {t('queryEditor.exportCsv', {}, { defaultValue: 'CSV' })}
                </button>
              </header>
              <div className={'overflow-x-auto'}>
                <table className={'w-full'}>
                  <thead>
                    <tr>
                      {result.rows.map((c) => (
                        <th
                          key={c.col}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            'text-left text-[10px] uppercase tracking-widest font-black font-mono text-on-surface-variant',
                          )}
                        >
                          {c.col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={'divide-y divide-outline-variant/40'}>
                    {result.rows[0]?.values.map((_, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={'hover:bg-surface-container/50 transition-colors'}
                      >
                        {result.rows.map((c) => (
                          <td
                            key={c.col}
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 3),
                              cm.textSize('sm'),
                              'tabular-nums font-mono text-on-surface',
                            )}
                          >
                            {c.values[rowIdx]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              className={cm.cn(
                'lg:col-span-2',
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 overflow-hidden',
              )}
            >
              <header
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  'bg-surface-container border-b border-outline-variant/40',
                )}
              >
                <h3
                  className={cm.cn(
                    'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface-variant',
                  )}
                >
                  {t('queryEditor.sqlHeading', {}, { defaultValue: 'Generated SQL' })}
                </h3>
                <button
                  type="button"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors',
                  )}
                  onClick={copySql}
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('xs'))}
                    aria-hidden="true"
                  >
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied
                    ? t('common.copied', {}, { defaultValue: 'Copied' })
                    : t('common.copy', {}, { defaultValue: 'Copy' })}
                </button>
              </header>
              <pre
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.textSize('xs'),
                  'font-mono text-on-surface bg-surface-container-low overflow-x-auto leading-relaxed whitespace-pre',
                )}
              >
                {result.generated_sql}
              </pre>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default QueryEditor
