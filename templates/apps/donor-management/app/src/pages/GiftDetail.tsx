import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'
import type { Gift } from '../types.js'

export function GiftDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [gift, setGift] = useState<Gift | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/gifts/${id}`)
      .then((res) => {
        if (!cancelled) setGift(unwrapSingle<Gift>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('gifts.notFound', {}, { defaultValue: 'Gift not found.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('p', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !gift) {
    return (
      <div className={cm.cn(cm.sp('p', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/gifts" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('gifts.backToList', {}, { defaultValue: 'Back to gifts' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/gifts" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('gifts.backToList', {}, { defaultValue: 'Back to gifts' })}
        </Link>
      </nav>

      <div className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <div className={cm.flex({ align: 'start', justify: 'between' })}>
          <div>
            <p className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
              {formatMoney(gift.amount_cents)}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {gift.gift_date} ·{' '}
              {t(`gift.method.${gift.method}`, {}, { defaultValue: gift.method })} ·{' '}
              {t(`gift.fund.${gift.fund}`, {}, { defaultValue: gift.fund })}
            </p>
          </div>
          {gift.receipt_id ? (
            <Link
              to={`/receipts/${gift.receipt_id}`}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                'rounded-full bg-success-container text-on-success-container',
              )}
            >
              {t('gift.receipted', {}, { defaultValue: 'Receipted' })}
            </Link>
          ) : (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                'rounded-full bg-surface-container text-on-surface-variant',
              )}
            >
              {t('gift.notReceipted', {}, { defaultValue: 'Not receipted' })}
            </span>
          )}
        </div>

        <dl className={cm.stack(2)}>
          <Row label={t('gifts.detail.donor', {}, { defaultValue: 'Donor' })}>
            <Link to={`/donors/${gift.donor_id}`} className={'text-primary hover:underline'}>
              {gift.donor_name}
            </Link>
          </Row>
          <Row label={t('gifts.detail.campaign', {}, { defaultValue: 'Campaign' })}>
            {gift.campaign_name ?? '—'}
          </Row>
          <Row label={t('gifts.detail.note', {}, { defaultValue: 'Note' })}>{gift.note || '—'}</Row>
          <Row label={t('gifts.detail.recorded', {}, { defaultValue: 'Recorded' })}>
            {gift.created_at.slice(0, 10)}
          </Row>
        </dl>

        {!gift.receipted ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'gifts.detail.receiptHint',
              {},
              {
                defaultValue:
                  'Year-end: generate this donor’s tax receipt from the Receipts page — this gift will be included.',
              },
            )}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'start', gap: 'md' })}>
      <dt className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'w-32 shrink-0')}>
        {label}
      </dt>
      <dd className={cm.textSize('sm')}>{children}</dd>
    </div>
  )
}
