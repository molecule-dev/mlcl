import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Coupon {
  id: string
  deal_id: string
  title: string
  merchant: string
  redemption_code: string
  discount_pct: number
  deal_price_cents: number
  status: 'active' | 'redeemed' | 'expired'
  saved_at: string
  expires_at: string
  redeemed_at?: string | null
}

const STATUSES = ['active', 'redeemed', 'expired'] as const
type Status = (typeof STATUSES)[number]

function readTabFromHash(): Status {
  if (typeof window === 'undefined') return 'active'
  const h = window.location.hash.replace('#', '')
  return (STATUSES as readonly string[]).includes(h) ? (h as Status) : 'active'
}

const STATUS_COLOR: Record<Status, string> = {
  active: 'bg-success/15 text-success',
  redeemed: 'bg-info/15 text-info',
  expired: 'bg-surface-container line-through',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MyCoupons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const location = useLocation()
  const [tab, setTab] = useState<Status>(readTabFromHash)

  useEffect(() => {
    setTab(readTabFromHash())
    const onHashChange = () => setTab(readTabFromHash())
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [location.pathname, location.hash])

  function selectTab(next: Status) {
    setTab(next)
    if (typeof window !== 'undefined') window.location.hash = next
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/my_coupons')
      .then((res) => {
        if (!cancelled) setCoupons(unwrapList<Coupon>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('myCoupons.loadError', {}, { defaultValue: 'Failed to load coupons.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => coupons.filter((c) => c.status === tab), [coupons, tab])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('myCoupons.heading', {}, { defaultValue: 'My coupons' })}
        </h1>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ gap: 'sm' }))}>
        {STATUSES.map((s) => {
          const count = coupons.filter((c) => c.status === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => selectTab(s)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.roundedFull,
                tab === s
                  ? cm.cn('bg-primary text-on-primary')
                  : cm.cn(
                      'bg-surface-container',
                      'text-on-surface-variant',
                      'hover:bg-surface-container-high',
                    ),
              )}
            >
              {t(
                `myCoupons.tab.${s}`,
                {},
                { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
              )}{' '}
              ({count})
            </button>
          )
        })}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('myCoupons.empty', {}, { defaultValue: 'No coupons in this tab.' })}
        </p>
      ) : (
        <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
          {filtered.map((c) => (
            <li key={c.id} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <header className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'bg-success/15 text-success',
                  )}
                >
                  {c.discount_pct}% OFF
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    STATUS_COLOR[c.status],
                  )}
                >
                  {t(`myCoupons.status.${c.status}`, {}, { defaultValue: c.status })}
                </span>
              </header>
              <Link
                to={`/deals/${c.deal_id}`}
                className={cm.cn(
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'hover:underline block py-1',
                )}
              >
                {c.title}
              </Link>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{c.merchant}</p>
              <div className={cm.cn(cm.sp('p', 3), 'bg-surface-container rounded-md text-center')}>
                <code
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'font-mono tabular-nums tracking-widest',
                  )}
                >
                  {c.redemption_code}
                </code>
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {c.status === 'redeemed'
                  ? t(
                      'myCoupons.redeemedAt',
                      { when: fmtDate(c.redeemed_at) },
                      { defaultValue: 'Redeemed {{when}}' },
                    )
                  : c.status === 'expired'
                    ? t(
                        'myCoupons.expiredAt',
                        { when: fmtDate(c.expires_at) },
                        { defaultValue: 'Expired {{when}}' },
                      )
                    : t(
                        'myCoupons.expires',
                        { when: fmtDate(c.expires_at) },
                        { defaultValue: 'Expires {{when}}' },
                      )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
