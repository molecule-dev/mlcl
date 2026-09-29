import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'
import type { Gift } from '../types.js'

const METHODS = ['check', 'card', 'cash', 'ach'] as const

export function Gifts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  // Campaigns cards deep-link here with ?campaign_id=<id> — honor it.
  const campaignParam = searchParams.get('campaign_id') ?? ''
  const [list, setList] = useState<Gift[]>([])
  const [methodFilter, setMethodFilter] = useState('')
  const [receiptedFilter, setReceiptedFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/gifts')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Gift>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('gifts.loadError', {}, { defaultValue: 'Failed to load gifts.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(
    () =>
      list.filter((g) => {
        if (campaignParam && g.campaign_id !== campaignParam) return false
        if (methodFilter && g.method !== methodFilter) return false
        if (receiptedFilter === 'yes' && !g.receipted) return false
        if (receiptedFilter === 'no' && g.receipted) return false
        return true
      }),
    [list, methodFilter, receiptedFilter, campaignParam],
  )
  const totalCents = visible.reduce((sum, g) => sum + g.amount_cents, 0)
  // Lockbox-reconciliation highlights — derived live from the ledger.
  const unreceipted = list.filter((g) => !g.receipted)
  const unreceiptedCents = unreceipted.reduce((sum, g) => sum + g.amount_cents, 0)
  const receiptedPct =
    list.length > 0 ? Math.round((list.filter((g) => g.receipted).length / list.length) * 100) : 100
  const campaignName = campaignParam
    ? (visible[0]?.campaign_name ??
      list.find((g) => g.campaign_id === campaignParam)?.campaign_name ??
      campaignParam)
    : ''

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('gifts.heading', {}, { defaultValue: 'Gifts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'gifts.subheading',
              { count: visible.length, total: formatMoney(totalCents) },
              { defaultValue: '{{count}} gifts · {{total}} total' },
            )}
          </p>
        </div>
        <Link
          to="/gifts/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('gifts.recordLabel', {}, { defaultValue: 'Record gift' })}
        </Link>
      </header>

      {campaignParam ? (
        <p
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-md bg-primary-container text-on-primary-container flex items-center gap-2 flex-wrap',
          )}
        >
          <span>
            {t(
              'gifts.filteredByCampaign',
              { campaign: campaignName },
              { defaultValue: 'Showing gifts for {{campaign}}' },
            )}
          </span>
          <Link to="/gifts" className={cm.cn(cm.fontWeight('semibold'), 'underline')}>
            {t('gifts.showAll', {}, { defaultValue: 'Show all' })}
          </Link>
        </p>
      ) : null}

      <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          aria-label={t('gifts.filterByMethod', {}, { defaultValue: 'Filter by method' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md',
            cm.textSize('sm'),
          )}
        >
          <option value="">{t('gifts.allMethods', {}, { defaultValue: 'All methods' })}</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`gift.method.${m}`, {}, { defaultValue: m })}
            </option>
          ))}
        </select>
        <select
          value={receiptedFilter}
          onChange={(e) => setReceiptedFilter(e.target.value)}
          aria-label={t(
            'gifts.filterByReceipted',
            {},
            { defaultValue: 'Filter by receipt status' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'border border-outline-variant rounded-md',
            cm.textSize('sm'),
          )}
        >
          <option value="">
            {t('gifts.allReceiptStates', {}, { defaultValue: 'Receipted + unreceipted' })}
          </option>
          <option value="yes">{t('gifts.receiptedOnly', {}, { defaultValue: 'Receipted' })}</option>
          <option value="no">
            {t('gifts.unreceiptedOnly', {}, { defaultValue: 'Not receipted' })}
          </option>
        </select>
      </div>

      {list.length > 0 ? (
        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <section
            data-mol-id="gifts-lockbox"
            className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}
          >
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t('gifts.lockboxHeading', {}, { defaultValue: 'Lockbox reconciliation' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'gifts.lockboxBody',
                { count: unreceipted.length, total: formatMoney(unreceiptedCents) },
                {
                  defaultValue:
                    '{{count}} recorded gifts ({{total}}) are awaiting their year-end receipt — checks, ACH, and cash waiting on deposit match.',
                },
              )}
            </p>
            <Link
              to="/receipts"
              data-mol-id="gifts-lockbox-cta"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md bg-primary text-on-primary self-start',
              )}
            >
              {t('gifts.lockboxCta', {}, { defaultValue: 'Review & receipt' })}
            </Link>
          </section>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t('gifts.coverageHeading', {}, { defaultValue: 'Receipt coverage' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'gifts.coverageBody',
                { pct: receiptedPct },
                {
                  defaultValue:
                    '{{pct}}% of recorded gifts are covered by an issued receipt — substantiation ready for the IRS ledger.',
                },
              )}
            </p>
            <div
              className={cm.cn('h-2 rounded-full bg-surface-container')}
              role="progressbar"
              aria-valuenow={receiptedPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('gifts.coverageHeading', {}, { defaultValue: 'Receipt coverage' })}
            >
              <div
                className={'h-2 rounded-full bg-primary'}
                style={{ width: `${receiptedPct}%` }}
              />
            </div>
          </section>
        </div>
      ) : null}

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-lg bg-error-container text-on-error-container flex items-center justify-between gap-3 flex-wrap',
          )}
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setLoading(true)
              http
                .get('/gifts')
                .then((res) => setList(unwrapList<Gift>(res)))
                .catch(() =>
                  setError(t('gifts.loadError', {}, { defaultValue: 'Failed to load gifts.' })),
                )
                .finally(() => setLoading(false))
            }}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'border border-current rounded-md',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('gifts.empty', {}, { defaultValue: 'No gifts match.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('gifts.col.date', {}, { defaultValue: 'Date' })}</Th>
                <Th>{t('gifts.col.donor', {}, { defaultValue: 'Donor' })}</Th>
                <Th>{t('gifts.col.amount', {}, { defaultValue: 'Amount' })}</Th>
                <Th>{t('gifts.col.method', {}, { defaultValue: 'Method' })}</Th>
                <Th>{t('gifts.col.fund', {}, { defaultValue: 'Fund' })}</Th>
                <Th>{t('gifts.col.campaign', {}, { defaultValue: 'Campaign' })}</Th>
                <Th>{t('gifts.col.receipted', {}, { defaultValue: 'Receipt' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => (
                <tr
                  key={g.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    <Link to={`/gifts/${g.id}`} className={cm.cn('inline-block', cm.sp('py', 1))}>
                      {g.gift_date}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link
                      to={`/donors/${g.donor_id}`}
                      className={cm.cn('inline-block', cm.sp('py', 1))}
                    >
                      {g.donor_name}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    {formatMoney(g.amount_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {t(`gift.method.${g.method}`, {}, { defaultValue: g.method })}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {t(`gift.fund.${g.fund}`, {}, { defaultValue: g.fund })}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {g.campaign_name ?? '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {g.receipt_id ? (
                      <Link
                        to={`/receipts/${g.receipt_id}`}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded-full bg-success-container text-on-success-container',
                        )}
                      >
                        {t('gift.receipted', {}, { defaultValue: 'receipted' })}
                      </Link>
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
