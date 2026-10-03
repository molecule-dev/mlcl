import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PreviewRow {
  row_index: number
  values: Record<string, unknown>
}

interface SchemaField {
  name: string
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'timestamp'
  nullable: boolean
  example: string
  unique_count: number
}

interface Statistic {
  field: string
  min: string
  max: string
  mean?: string
  median?: string
  null_pct: number
}

interface DatasetDetail {
  id: string
  name: string
  description: string
  rows: number
  size_bytes: number
  format: string
  schema: SchemaField[]
  statistics: Statistic[]
  ai_insights: { type: string; headline: string; body: string }[]
}

const TABS = ['schema', 'sample', 'statistics', 'queries', 'lineage'] as const
type Tab = (typeof TABS)[number]

const TYPE_COLOR: Record<SchemaField['type'], string> = {
  string: 'bg-info/15 text-info',
  integer: 'bg-success/15 text-success',
  float: 'bg-success/15 text-success',
  boolean: 'bg-warning/15 text-warning',
  date: 'bg-secondary/15 text-secondary',
  timestamp: 'bg-secondary/15 text-secondary',
}

function fmtBytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} MB`
  return `${(n / 1_000).toFixed(0)} KB`
}

export function DatasetDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [dataset, setDataset] = useState<DatasetDetail | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('schema')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extracted so the LoadErrorBanner's Retry re-runs the same load the mount
  // effect uses (the banner owns the retry's pending/disabled state).
  const load = useCallback(async (): Promise<void> => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await http.get(`/api/datasets/${id}`)
      setDataset(unwrapSingle<DatasetDetail>(res))
    } catch (_error) {
      // The request failed — the LoadErrorBanner carries the localized
      // message; nothing further to do with the thrown value.
      setError(t('datasetDetail.loadError', {}, { defaultValue: 'Failed to load dataset.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!id || tab !== 'sample' || preview.length > 0) return
    let cancelled = false
    setPreviewLoading(true)
    http
      .get(`/api/datasets/${id}/preview?limit=50`)
      .then((res) => {
        if (!cancelled) setPreview(unwrapList<PreviewRow>(res))
      })
      .catch(() => {
        /* leave empty; UI handles empty state */
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, tab, preview.length])

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error)
    return (
      <div className={cm.sp('p', 8)}>
        <LoadErrorBanner data-mol-id="dataset-detail-load-error" message={error} onRetry={load} />
      </div>
    )
  if (!dataset)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {t('datasetDetail.notFound', {}, { defaultValue: 'Dataset not found.' })}
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link to="/datasets" className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}>
        ← {t('datasetDetail.back', {}, { defaultValue: 'Datasets' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'uppercase tracking-wide',
            'text-on-surface-variant',
            'font-mono',
          )}
        >
          {dataset.format} · {dataset.id}
        </p>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
          {dataset.name}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {dataset.description}
        </p>
        <dl className={cm.cn(cm.flex({ gap: 'lg' }), cm.sp('mt', 4), cm.textSize('sm'))}>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('datasetDetail.rows', {}, { defaultValue: 'Rows' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
              {dataset.rows.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('datasetDetail.cols', {}, { defaultValue: 'Columns' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
              {dataset.schema.length}
            </dd>
          </div>
          <div>
            <dt
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {t('form.size', {}, { defaultValue: 'Size' })}
            </dt>
            <dd className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
              {fmtBytes(dataset.size_bytes)}
            </dd>
          </div>
        </dl>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8', cm.card(), 'overflow-hidden')}>
          <nav className={'flex border-b border-outline-variant'} aria-label="Dataset tabs">
            {TABS.map((tk) => (
              <button
                key={tk}
                type="button"
                onClick={() => setTab(tk)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'border-b-2',
                  tab === tk
                    ? cm.cn('border-primary', cm.textPrimary)
                    : cm.cn(
                        'border-transparent',
                        'text-on-surface-variant',
                        'hover:text-on-surface',
                      ),
                )}
              >
                {t(
                  `datasetDetail.tab.${tk}`,
                  {},
                  { defaultValue: tk.charAt(0).toUpperCase() + tk.slice(1) },
                )}
              </button>
            ))}
          </nav>

          {tab === 'schema' && (
            // overflow-x-auto: 5 columns don't fit a 390px phone — scroll
            // the table inside the card instead of clipping columns.
            <div className={'overflow-x-auto'}>
              <table className={'w-full'}>
                <thead
                  className={cm.cn(
                    'bg-surface-container',
                    cm.textSize('xs'),
                    'uppercase tracking-wide',
                    'text-on-surface-variant',
                  )}
                >
                  <tr>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                      {t('datasetDetail.col.name', {}, { defaultValue: 'Field' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                      {t('form.type', {}, { defaultValue: 'Type' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                      {t('datasetDetail.col.example', {}, { defaultValue: 'Example' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                      {t('datasetDetail.col.unique', {}, { defaultValue: 'Unique' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                      {t('datasetDetail.col.nullable', {}, { defaultValue: 'Nullable' })}
                    </th>
                  </tr>
                </thead>
                <tbody className={'divide-y divide-outline-variant'}>
                  {dataset.schema.map((f) => (
                    <tr key={f.name}>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.fontWeight('semibold'),
                          'font-mono',
                        )}
                      >
                        {f.name}
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.roundedFull,
                            TYPE_COLOR[f.type],
                          )}
                        >
                          {f.type}
                        </span>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                          'font-mono truncate max-w-xs',
                        )}
                      >
                        {f.example}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'text-right tabular-nums',
                          'text-on-surface-variant',
                        )}
                      >
                        {f.unique_count.toLocaleString()}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        {f.nullable ? 'yes' : 'no'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'sample' &&
            (previewLoading ? (
              <p className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
                {t('datasetDetail.sampleLoading', {}, { defaultValue: 'Loading preview…' })}
              </p>
            ) : preview.length === 0 ? (
              <p className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
                {t(
                  'datasetDetail.sampleEmpty',
                  {},
                  { defaultValue: 'No sample rows captured for this dataset.' },
                )}
              </p>
            ) : (
              <div className={'overflow-x-auto'}>
                <table className={'w-full'}>
                  <thead
                    className={cm.cn(
                      'bg-surface-container',
                      cm.textSize('xs'),
                      'uppercase tracking-wide',
                      'text-on-surface-variant',
                    )}
                  >
                    <tr>
                      <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>#</th>
                      {dataset.schema.map((f) => (
                        <th
                          key={f.name}
                          className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left font-mono')}
                        >
                          {f.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={'divide-y divide-outline-variant'}>
                    {preview.map((r) => (
                      <tr key={r.row_index}>
                        <td
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.textSize('xs'),
                            'tabular-nums text-on-surface-variant',
                          )}
                        >
                          {r.row_index + 1}
                        </td>
                        {dataset.schema.map((f) => {
                          const v = r.values[f.name]
                          const display =
                            v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
                          return (
                            <td
                              key={f.name}
                              className={cm.cn(
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                cm.textSize('xs'),
                                'font-mono truncate max-w-[14rem]',
                              )}
                            >
                              {display}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          {tab === 'statistics' && (
            <div className={'overflow-x-auto'}>
              <table className={'w-full'}>
                <thead
                  className={cm.cn(
                    'bg-surface-container',
                    cm.textSize('xs'),
                    'uppercase tracking-wide',
                    'text-on-surface-variant',
                  )}
                >
                  <tr>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                      {t('datasetDetail.col.name', {}, { defaultValue: 'Field' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                      {t('datasetDetail.stat.min', {}, { defaultValue: 'Min' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                      {t('datasetDetail.stat.max', {}, { defaultValue: 'Max' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                      {t('datasetDetail.stat.mean', {}, { defaultValue: 'Mean' })}
                    </th>
                    <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                      {t('datasetDetail.stat.nullPct', {}, { defaultValue: 'Null %' })}
                    </th>
                  </tr>
                </thead>
                <tbody className={'divide-y divide-outline-variant'}>
                  {dataset.statistics.map((s) => (
                    <tr key={s.field}>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'font-mono',
                          cm.fontWeight('semibold'),
                        )}
                      >
                        {s.field}
                      </td>
                      <td
                        className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}
                      >
                        {s.min}
                      </td>
                      <td
                        className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}
                      >
                        {s.max}
                      </td>
                      <td
                        className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}
                      >
                        {s.mean ?? '—'}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'text-right tabular-nums',
                          'text-on-surface-variant',
                        )}
                      >
                        {s.null_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'queries' && (
            <p className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t(
                'datasetDetail.queriesEmpty',
                {},
                { defaultValue: 'No saved queries on this dataset yet.' },
              )}
            </p>
          )}
          {tab === 'lineage' && (
            <p className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t(
                'datasetDetail.lineageEmpty',
                {},
                { defaultValue: 'Imported from upload — no upstream transforms.' },
              )}
            </p>
          )}
        </section>

        <aside
          className={cm.cn(
            'col-span-12 lg:col-span-4',
            cm.card(),
            cm.sp('p', 5),
            'space-y-3 sticky top-24',
          )}
        >
          <h2 className={cm.sectionHeading}>
            ✨ {t('datasetDetail.aiHeading', {}, { defaultValue: 'AI insights' })}
          </h2>
          <ul className={'space-y-3'}>
            {dataset.ai_insights.map((ix, i) => (
              <li
                key={i}
                className={cm.cn(
                  cm.sp('p', 3),
                  'bg-secondary-container text-on-secondary-container rounded-md',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wide',
                  )}
                >
                  {ix.type}
                </p>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mt', 1))}>
                  {ix.headline}
                </p>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>{ix.body}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
