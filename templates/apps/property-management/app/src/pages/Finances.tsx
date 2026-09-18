import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RentRollRow {
  id: string
  property: string
  unit: string
  tenant: string
  due_cents: number
  paid_cents: number
  due_date: string
  status: 'paid' | 'pending' | 'overdue' | 'partial'
}

interface Summary {
  total_due_cents: number
  total_paid_cents: number
  total_outstanding_cents: number
  total_overdue_cents: number
  overdue_count: number
  collection_rate_pct: number
}

const STATUS: Record<RentRollRow['status'], { label: string; classes: string }> = {
  paid: { label: 'Paid', classes: 'bg-success-light text-success' },
  pending: { label: 'Pending', classes: 'bg-warning-light text-warning' },
  overdue: { label: 'Overdue', classes: 'bg-error-light text-error' },
  partial: { label: 'Partial', classes: 'bg-tertiary-container text-on-tertiary-container' },
}

function fmtCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}
function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
}

export function Finances() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<RentRollRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<RentRollRow[]>('/api/finances/rent-roll').catch(() => null),
      http.get<Summary>('/api/finances/summary').catch(() => null),
    ])
      .then(([rRes, sRes]) => {
        if (cancelled) return
        const list = Array.isArray(rRes) ? rRes : ((rRes as { data?: RentRollRow[] })?.data ?? [])
        setRows(list)
        const s = sRes as { data?: Summary } | Summary | null
        if (s && typeof s === 'object' && 'total_due_cents' in (s as Summary)) {
          setSummary(s as Summary)
        } else if (s && typeof s === 'object' && 'data' in s && (s as { data?: Summary }).data) {
          setSummary((s as { data?: Summary }).data ?? null)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const totalDue = summary?.total_due_cents ?? rows.reduce((acc, r) => acc + r.due_cents, 0)
  const totalPaid = summary?.total_paid_cents ?? rows.reduce((acc, r) => acc + r.paid_cents, 0)
  const totalOutstanding = summary?.total_outstanding_cents ?? totalDue - totalPaid
  const overdueAmount =
    summary?.total_overdue_cents ??
    rows.filter((r) => r.status === 'overdue').reduce((a, r) => a + (r.due_cents - r.paid_cents), 0)
  const overdueCount = summary?.overdue_count ?? rows.filter((r) => r.status === 'overdue').length
  const collectionRate =
    summary?.collection_rate_pct ?? (totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0)

  const exportCsv = async () => {
    setExportError(null)
    setExportingCsv(true)
    try {
      // Use the bonded http client — it carries the in-memory bearer token and
      // sends the httpOnly session cookie (same-origin, credentials). Post-M1-1
      // the bearer is no longer in localStorage, so never hand-attach a token here.
      const res = await http.get<Blob>('/api/finances/rent-roll.csv', { responseType: 'blob' })
      const objUrl = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = 'rent-roll.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
    } catch (err) {
      // The http client throws HttpError (with `.status`) on non-2xx responses.
      const status = (err as { status?: number })?.status
      if (status === 402) {
        setExportError(
          t('finances.exportLocked', {}, { defaultValue: 'CSV export requires the Pro plan.' }),
        )
      } else {
        setExportError(err instanceof Error ? err.message : 'Export failed')
      }
    } finally {
      setExportingCsv(false)
    }
  }

  const summaryCards = [
    {
      key: 'collected',
      defaultLabel: 'Collected',
      value: fmtCurrency(totalPaid),
      sublabel: t(
        'finances.collectedSublabel',
        { rate: collectionRate },
        { defaultValue: '{{rate}}% collection rate' },
      ),
      tone: 'border-l-emerald-500',
      valueClass: 'text-success',
    },
    {
      key: 'outstanding',
      defaultLabel: 'Outstanding',
      value: fmtCurrency(totalOutstanding),
      sublabel: t('finances.outstandingSublabel', {}, { defaultValue: 'across pending + overdue' }),
      tone: 'border-l-amber-500',
      valueClass: 'text-warning',
    },
    {
      key: 'overdue',
      defaultLabel: 'Overdue',
      value: fmtCurrency(overdueAmount),
      sublabel: t(
        'finances.overdueSublabel',
        { count: overdueCount },
        { defaultValue: '{{count}} balances late' },
      ),
      tone: 'border-l-red-500',
      valueClass: 'text-error',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('finances.heading', {}, { defaultValue: 'Finances' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'finances.subheading',
            {},
            { defaultValue: 'Rent roll, arrears, and reconciliation across the portfolio.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}
        data-testid="finances-summary"
      >
        {summaryCards.map((c) => (
          <div
            key={c.key}
            data-testid={`finances-summary-${c.key}`}
            className={cm.cn(
              cm.sp('p', 6),
              cm.flex({ direction: 'col', gap: 'sm' }),
              `bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 ${c.tone}`,
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`finances.summary.${c.key}`, {}, { defaultValue: c.defaultLabel })}
            </span>
            <span
              className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight', c.valueClass)}
            >
              {c.value}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {c.sublabel}
            </span>
          </div>
        ))}
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('finances.rentRollHeading', {}, { defaultValue: 'Rent roll' })}
          </h2>
          <button
            type="button"
            data-testid="finances-export-csv"
            onClick={exportCsv}
            disabled={exportingCsv}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.roundedFull,
              'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container disabled:opacity-50',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              download
            </span>
            {exportingCsv
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
        {exportError && (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.sp('mb', 4),
              'rounded-xl bg-warning-light text-warning border border-amber-200 text-sm',
            )}
            data-testid="finances-export-error"
          >
            {exportError}
          </div>
        )}
        {loading ? (
          <div
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : rows.length === 0 ? (
          <div
            className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
            data-testid="finances-empty"
          >
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'finances.empty',
                {},
                {
                  defaultValue:
                    'No active leases yet — rent roll appears here once you have leases and rent payments.',
                },
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={cm.cn(cm.w('full'), 'text-sm')}>
              <thead>
                <tr className={'border-b border-outline-variant text-left'}>
                  {['unit', 'tenant', 'due', 'paid', 'balance', 'status'].map((h) => (
                    <th
                      key={h}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`finances.col.${h}`, {}, { defaultValue: h })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60" data-testid="finances-tbody">
                {rows.map((r) => {
                  const balance = r.due_cents - r.paid_cents
                  const pill = STATUS[r.status]
                  return (
                    <tr key={r.id} className={'hover:bg-surface-container-low transition-colors'}>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                          {r.property}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'finances.unitLabel',
                            { unit: r.unit },
                            { defaultValue: 'Unit {{unit}}' },
                          )}{' '}
                          · {fmtDate(r.due_date)}
                        </p>
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface')}>
                        {r.tenant}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'tabular-nums text-on-surface',
                        )}
                      >
                        {fmtCurrency(r.due_cents)}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'tabular-nums text-success',
                        )}
                      >
                        {fmtCurrency(r.paid_cents)}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'tabular-nums font-semibold',
                          balance > 0 ? 'text-error' : 'text-on-surface-variant',
                        )}
                      >
                        {balance > 0 ? `(${fmtCurrency(balance)})` : '—'}
                      </td>
                      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            'text-[10px] font-black uppercase tracking-widest',
                            pill.classes,
                          )}
                        >
                          {t(`finances.status.${r.status}`, {}, { defaultValue: pill.label })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
