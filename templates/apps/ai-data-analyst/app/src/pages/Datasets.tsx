import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DatasetCard, type DatasetCardData } from '../components/DatasetCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Datasets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [datasets, setDatasets] = useState<DatasetCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/datasets')
      .then((res) => {
        if (!cancelled) setDatasets(unwrapList<DatasetCardData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('datasets.loadError', {}, { defaultValue: 'Failed to load datasets.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalRows = datasets.reduce((acc, d) => acc + d.rows, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.flex({ direction: 'col', gap: 6 }))}>
      <div className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 4 })}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface-variant',
            )}
          >
            {t(
              'datasets.eyebrow',
              { count: datasets.length, rows: totalRows.toLocaleString() },
              { defaultValue: '{{count}} datasets · {{rows}} rows' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'font-headline tracking-tight',
            )}
          >
            {t('datasets.heading', {}, { defaultValue: 'Datasets' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}
          >
            {t(
              'datasets.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Files {{appName}} has indexed and made queryable. Click a card to inspect schema, statistics, and lineage.',
              },
            )}
          </p>
        </div>
        <Link
          to="/upload"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 transition-opacity',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
            aria-hidden="true"
          >
            upload_file
          </span>
          {t('datasets.uploadCta', {}, { defaultValue: 'Upload dataset' })}
        </Link>
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2 xl:grid-cols-3')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={'rounded-2xl bg-surface-container-low animate-pulse h-[280px]'}
            />
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'datasets.empty',
            {},
            { defaultValue: 'No datasets yet — upload one to get started.' },
          )}
        </p>
      ) : (
        <>
          <section
            aria-labelledby="datasets-repository-heading"
            className={cm.flex({ direction: 'col', gap: 3 })}
          >
            <h2
              id="datasets-repository-heading"
              className={cm.cn(
                'text-[10px] uppercase tracking-[0.22em] font-black text-on-surface',
              )}
            >
              {t('datasets.repositoryHeading', {}, { defaultValue: 'Data Repository' })}
            </h2>
            <ul
              className={cm.cn(
                cm.grid({ cols: 1, gap: 4 }),
                'sm:grid-cols-2 xl:grid-cols-3 list-none p-0',
              )}
            >
              {datasets.map((d) => (
                <li key={d.id}>
                  <DatasetCard dataset={d} />
                </li>
              ))}
            </ul>
          </section>

          {/* Design's bottom upload surface — the repository always offers the
              next ingest one click away. A div (not li): the fleet e2e asserts
              `main li` count equals the API's dataset count exactly. */}
          <div className={cm.flex({ justify: 'center' })}>
            <Link
              to="/upload"
              data-mol-id="datasets-upload-another"
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 2 }),
                cm.sp('px', 10),
                cm.sp('py', 6),
                cm.textCenter,
                'rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/50 hover:border-primary/40 hover:bg-surface-container-low transition-colors',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  'bg-primary/10 text-primary',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
                  cloud_upload
                </span>
              </span>
              <span
                className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}
              >
                {t('datasets.uploadAnother', {}, { defaultValue: 'Upload another dataset' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'datasets.uploadAnotherSub',
                  {},
                  {
                    defaultValue:
                      'CSV, JSON, JSONL, XLSX, or Parquet — parsed right in your browser',
                  },
                )}
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default Datasets
