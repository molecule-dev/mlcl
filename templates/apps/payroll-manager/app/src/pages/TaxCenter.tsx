import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney, toNum } from '../lib/money.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface TaxLiability {
  year: number
  quarter: number
  stub_count: number
  federal_tax: number | string
  state_tax: number | string
  fica: number | string
  medicare: number | string
  total_liability: number | string
}

interface YtdTotals {
  federal: number
  fica: number
  state: number
  medicare: number
}

export function TaxCenter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [quarters, setQuarters] = useState<TaxLiability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all(
      [1, 2, 3, 4].map((q) =>
        http
          .get(`/api/reports/tax-liability?year=${year}&quarter=${q}`)
          .then(unwrapSingle<TaxLiability>)
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (cancelled) return
        setQuarters(results.filter((r): r is TaxLiability => r !== null))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('taxCenter.loadError', {}, { defaultValue: 'Could not load tax data.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [http, year, t])

  const ytd = quarters.reduce<YtdTotals>(
    (acc, q) => ({
      federal: acc.federal + toNum(q.federal_tax),
      fica: acc.fica + toNum(q.fica),
      state: acc.state + toNum(q.state_tax),
      medicare: acc.medicare + toNum(q.medicare),
    }),
    { federal: 0, fica: 0, state: 0, medicare: 0 },
  )
  const ytdTotal = ytd.federal + ytd.fica + ytd.state + ytd.medicare
  const totalStubs = quarters.reduce((s, q) => s + (q.stub_count || 0), 0)

  const buckets = [
    {
      key: 'federal',
      label: t('taxCenter.bucket.federal', {}, { defaultValue: 'Federal income' }),
      amount: ytd.federal,
      tint: 'text-primary',
      stripe: 'border-l-primary',
    },
    {
      key: 'fica',
      label: t('taxCenter.bucket.fica', {}, { defaultValue: 'Social Security' }),
      amount: ytd.fica,
      tint: 'text-secondary',
      stripe: 'border-l-secondary',
    },
    {
      key: 'state',
      label: t('taxCenter.bucket.state', {}, { defaultValue: 'State income' }),
      amount: ytd.state,
      tint: 'text-tertiary',
      stripe: 'border-l-tertiary',
    },
    {
      key: 'medicare',
      label: t('taxCenter.bucket.medicare', {}, { defaultValue: 'Medicare' }),
      amount: ytd.medicare,
      tint: 'text-info',
      stripe: 'border-l-info',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'sm' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('taxCenter.eyebrow', { year }, { defaultValue: 'Compliance · YTD {{year}}' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('taxCenter.heading', {}, { defaultValue: 'Tax center' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {totalStubs === 0
              ? t(
                  'taxCenter.emptySubheading',
                  {},
                  { defaultValue: 'Process a pay run to populate tax withholdings.' },
                )
              : t(
                  'taxCenter.subheading',
                  { total: fmtMoney(ytdTotal) },
                  { defaultValue: '{{total}} withheld year-to-date.' },
                )}
          </p>
        </div>
        <label className={cm.cn(cm.textSize('xs'), 'flex items-center gap-2')}>
          <span className="uppercase tracking-widest text-on-surface-variant">
            {t('taxCenter.yearLabel', {}, { defaultValue: 'Year' })}
          </span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant bg-surface-container-low',
            )}
          >
            {[year + 1, year, year - 1, year - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
      ) : (
        <>
          <section
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {buckets.map((b) => (
              <div
                key={b.key}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest border-l-4 shadow-sm',
                  b.stripe,
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {b.label}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.sp('mt', 2),
                    'font-extrabold tabular-nums',
                    b.tint,
                  )}
                >
                  {fmtMoney(b.amount)}
                </p>
              </div>
            ))}
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
            )}
          >
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('taxCenter.quartersHeading', {}, { defaultValue: 'Quarters' })}
              </h2>
            </div>
            <ul className={cm.stack(2)}>
              {quarters.length === 0 ? (
                <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'taxCenter.noQuarters',
                    {},
                    { defaultValue: 'No tax stubs filed for this year.' },
                  )}
                </li>
              ) : (
                quarters.map((q) => (
                  <li
                    key={`q${q.quarter}`}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 4),
                      cm.grid({ cols: 12 }),
                      'items-center bg-surface-container-low rounded-xl shadow-sm',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'col-span-3 md:col-span-2',
                      )}
                    >
                      {t(
                        'taxCenter.quarterLabel',
                        { quarter: q.quarter },
                        { defaultValue: 'Q{{quarter}}' },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'col-span-3 md:col-span-2 text-on-surface-variant tabular-nums',
                      )}
                    >
                      {q.stub_count}{' '}
                      {q.stub_count === 1
                        ? t('taxCenter.stub', {}, { defaultValue: 'stub' })
                        : t('taxCenter.stubs', {}, { defaultValue: 'stubs' })}
                    </span>
                    {/* Per-quarter tax split is table territory — phones get
                        the YTD bucket cards above instead. */}
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'hidden md:inline md:col-span-2 text-on-surface-variant tabular-nums',
                      )}
                    >
                      {fmtMoney(q.federal_tax)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'hidden md:inline md:col-span-2 text-on-surface-variant tabular-nums',
                      )}
                    >
                      {fmtMoney(q.fica)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'hidden md:inline md:col-span-2 text-on-surface-variant tabular-nums',
                      )}
                    >
                      {fmtMoney(q.state_tax)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'col-span-6 md:col-span-2 text-right tabular-nums',
                      )}
                    >
                      {fmtMoney(q.total_liability)}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'taxCenter.disclaimer',
                {},
                {
                  defaultValue:
                    'Filings (Form 941, DE 9C, etc.) are not generated automatically. Use these totals to prepare your filings or wire a tax-filing integration.',
                },
              )}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
