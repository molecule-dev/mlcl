import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

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
        if (methodFilter && g.method !== methodFilter) return false
        if (receiptedFilter === 'yes' && !g.receipted) return false
        if (receiptedFilter === 'no' && g.receipted) return false
        return true
      }),
    [list, methodFilter, receiptedFilter],
  )
  const totalCents = visible.reduce((sum, g) => sum + g.amount_cents, 0)

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

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
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
                    <Link to={`/gifts/${g.id}`}>{g.gift_date}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link to={`/donors/${g.donor_id}`}>{g.donor_name}</Link>
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
