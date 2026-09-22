import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { VendryKpiCard } from '../components/VendryKpiCard.js'

interface PayoutRow {
  id: string
  paid_on: string
  period: string
  gross_cents: number
  commission_cents: number
  net_cents: number
  status: 'paid' | 'pending' | 'failed'
}

interface ApiPayout {
  id: string
  payout_id?: string
  released_at?: string | null
  period?: string
  gross_cents?: number
  commission_cents?: number
  net_cents?: number
  status?: 'paid' | 'pending' | 'failed'
}

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

function exportPayoutsCsv(rows: PayoutRow[]): void {
  const header = [
    'Period',
    'Paid on',
    'Gross (cents)',
    'Commission (cents)',
    'Net (cents)',
    'Status',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [r.period, r.paid_on, r.gross_cents, r.commission_cents, r.net_cents, r.status].join(','),
    )
  }
  downloadFile(lines.join('\n'), `payouts-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
}

function downloadTaxInvoice(rows: PayoutRow[]): void {
  const ytdGross = rows.reduce((s, r) => s + r.gross_cents, 0)
  const ytdNet = rows.reduce((s, r) => s + r.net_cents, 0)
  const ytdCommission = rows.reduce((s, r) => s + r.commission_cents, 0)
  const yr = new Date().getFullYear()
  const lines = [
    `${APP_NAME.toUpperCase()} MARKETPLACE — TAX INVOICE`,
    `Year-to-date summary · ${yr}`,
    ``,
    `Gross sales:       $${(ytdGross / 100).toFixed(2)}`,
    `${APP_NAME} commission: $${(ytdCommission / 100).toFixed(2)}`,
    `Net payouts:       $${(ytdNet / 100).toFixed(2)}`,
    ``,
    `Generated ${new Date().toISOString()}`,
  ]
  downloadFile(lines.join('\n'), `vendry-tax-invoice-${yr}.txt`, 'text/plain')
}

const STATUS_TONES = {
  paid: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  failed: 'bg-error/15 text-error',
} as const

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function VendorPayouts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // null = still loading; [] = loaded with no payouts yet.
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: ApiPayout[] } | ApiPayout[]>('/api/vendors/me/payouts')
      .then((res) => {
        const raw = (res as { data?: unknown }).data ?? res
        const list = Array.isArray(raw)
          ? (raw as ApiPayout[])
          : ((raw as { data?: ApiPayout[] }).data ?? [])
        if (cancelled) return
        setPayouts(
          list.map((p) => ({
            id: String(p.id),
            paid_on: p.released_at
              ? new Date(p.released_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : t('status.pending', {}, { defaultValue: 'Pending' }),
            period: p.period ?? '—',
            gross_cents: Number(p.gross_cents ?? 0),
            commission_cents: Number(p.commission_cents ?? 0),
            net_cents: Number(p.net_cents ?? 0),
            status: (p.status ?? 'pending') as PayoutRow['status'],
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setPayouts([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const loaded = useMemo(() => payouts ?? [], [payouts])

  const ytdGross = useMemo(() => loaded.reduce((s, p) => s + p.gross_cents, 0), [loaded])
  const ytdNet = useMemo(() => loaded.reduce((s, p) => s + p.net_cents, 0), [loaded])
  const pending = useMemo(
    () => loaded.filter((p) => p.status === 'pending').reduce((s, p) => s + p.net_cents, 0),
    [loaded],
  )

  return (
    <div className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.sp('p', 8), 'max-w-[1280px] space-y-8')}>
      <header className={cm.cn(cm.stack(2))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-sky-700 dark:text-info',
          )}
        >
          {t('vendorPayouts.eyebrow', {}, { defaultValue: 'Vendor finance' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight font-extrabold text-on-surface',
          )}
        >
          {t('vendorPayouts.title', {}, { defaultValue: 'Payouts & commission' })}
        </h1>
        <p className={'text-on-surface-variant text-lg'}>
          {t(
            'vendorPayouts.subtitle',
            { appName: APP_NAME },
            {
              defaultValue: 'Friday payouts to Banco BPI, after {{appName}}’s flat 8% commission.',
            },
          )}
        </p>
      </header>

      {/* Hero strip */}
      <section
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-3xl bg-gradient-to-br from-success/10 via-surface to-info/10 border border-outline-variant',
        )}
      >
        <div className={cm.cn(cm.stack(2))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-success',
            )}
          >
            {t('vendorPayouts.nextPayoutLabel', {}, { defaultValue: 'Next payout · Friday May 2' })}
          </p>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl tracking-tight font-extrabold text-on-surface tabular-nums',
            )}
          >
            {formatCents(pending)}
          </p>
          <p className={'text-on-surface-variant text-sm'}>
            {t(
              'vendorPayouts.heroCaption',
              { account: '••• 4419' },
              { defaultValue: 'Settles to Banco BPI {{account}} · 1–2 business days' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <button
            type="button"
            onClick={() => exportPayoutsCsv(loaded)}
            data-testid="vendor-payouts-export"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.roundedFull,
              'border border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-colors',
            )}
          >
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
          <button
            type="button"
            onClick={() => downloadTaxInvoice(loaded)}
            data-testid="vendor-payouts-invoice"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.roundedFull,
              'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('vendorPayouts.invoiceCta', {}, { defaultValue: 'Download tax invoice' })}
          </button>
        </div>
      </section>

      {/* KPI grid */}
      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
        <VendryKpiCard
          icon="trending_up"
          label={t('vendorPayouts.kpi.ytdGross', {}, { defaultValue: 'YTD gross sales' })}
          value={formatCents(ytdGross)}
          trend="+11.4%"
          trendDirection="up"
          tone="success"
        />
        <VendryKpiCard
          icon="payments"
          label={t('vendorPayouts.kpi.ytdNet', {}, { defaultValue: 'YTD net payouts' })}
          value={formatCents(ytdNet)}
          tone="info"
        />
        <VendryKpiCard
          icon="percent"
          label={t(
            'vendorPayouts.kpi.commission',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} commission' },
          )}
          value="8.0%"
          caption={t(
            'vendorPayouts.kpi.commissionCaption',
            {},
            { defaultValue: 'Flat across every order' },
          )}
          tone="warning"
        />
      </section>

      {/* Payout history table */}
      <section className={'overflow-hidden rounded-3xl border border-outline-variant bg-surface'}>
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-b border-outline-variant',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('vendorPayouts.history', {}, { defaultValue: 'Payout history' })}
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className={cm.cn(cm.w('full'), cm.textSize('sm'))}>
            <thead className="bg-surface-container-low">
              <tr>
                {[
                  { key: 'period', label: 'Period' },
                  { key: 'paidOn', label: 'Paid on' },
                  { key: 'gross', label: 'Gross' },
                  { key: 'commission', label: 'Commission' },
                  { key: 'net', label: 'Net' },
                  { key: 'status', label: 'Status' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-left uppercase tracking-widest text-on-surface-variant text-[10px] whitespace-nowrap',
                    )}
                  >
                    {t(`vendorPayouts.col.${col.key}`, {}, { defaultValue: col.label })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {payouts === null ? (
                [0, 1, 2].map((i) => (
                  <tr key={i} aria-hidden>
                    <td colSpan={6} className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
                      <div className="h-3 w-full animate-pulse rounded bg-outline-variant" />
                    </td>
                  </tr>
                ))
              ) : loaded.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cm.cn(cm.sp('p', 8), 'text-center')}>
                    <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                      {t('vendorPayouts.emptyTitle', {}, { defaultValue: 'No payouts yet' })}
                    </p>
                    <p className={'text-on-surface-variant text-sm mt-1'}>
                      {t(
                        'vendorPayouts.emptyBody',
                        {},
                        {
                          defaultValue:
                            'Payouts are released every Friday once your sales clear the 8% commission.',
                        },
                      )}
                    </p>
                  </td>
                </tr>
              ) : (
                loaded.map((row) => (
                  <tr key={row.id} className={'hover:bg-surface-container-low transition-colors'}>
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}
                    >
                      {row.period}
                    </td>
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}
                    >
                      {row.paid_on}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'tabular-nums font-semibold',
                      )}
                    >
                      {formatCents(row.gross_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'tabular-nums text-sky-700 dark:text-info',
                      )}
                    >
                      −{formatCents(row.commission_cents)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'tabular-nums font-bold text-success',
                      )}
                    >
                      {formatCents(row.net_cents)}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          'uppercase tracking-widest',
                          STATUS_TONES[row.status],
                        )}
                      >
                        {t(`status.${row.status}`, {}, { defaultValue: row.status })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default VendorPayouts
