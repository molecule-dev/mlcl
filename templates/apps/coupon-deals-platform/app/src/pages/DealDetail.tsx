import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CouponCodeBlock } from '../components/CouponCodeBlock.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface DealDetailData {
  id: string
  title: string
  merchant: string
  merchant_id: string
  category: string
  description: string
  fine_print: string[]
  discount_pct: number
  original_price_cents: number
  deal_price_cents: number
  expires_at: string
  hot: boolean
  saved_count: number
  redemption_code: string
  qr_url: string
  redeemed: boolean
  saved: boolean
}

const CATEGORY_GLYPH: Record<string, string> = {
  Restaurants: 'restaurant',
  Beauty: 'spa',
  Fitness: 'fitness_center',
  Activities: 'hiking',
  Online: 'shopping_bag',
  Services: 'home_repair_service',
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function expiryInfo(
  iso: string,
  t: TranslateFunction,
): { label: string; tone: 'urgent' | 'warning' | 'normal' } {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return { label: t('expiry.expired', {}, { defaultValue: 'Expired' }), tone: 'normal' }
  const h = Math.floor(ms / (1000 * 60 * 60))
  if (h < 24)
    return {
      label: t('expiry.hoursLeft', { hours: h }, { defaultValue: '{{hours}}h left' }),
      tone: 'urgent',
    }
  const d = Math.floor(h / 24)
  if (d < 3)
    return {
      label: t(
        'expiry.daysHoursLeft',
        { days: d, hours: h - d * 24 },
        { defaultValue: '{{days}}d {{hours}}h left' },
      ),
      tone: 'warning',
    }
  return {
    label: t('expiry.daysLeft', { days: d }, { defaultValue: '{{days}}d left' }),
    tone: 'normal',
  }
}

export function DealDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [deal, setDeal] = useState<DealDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingCoupon, setSavingCoupon] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/deals/${id}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<DealDetailData>(res)
        setDeal(data)
        if (data) {
          void track({
            name: 'deal.viewed',
            properties: {
              deal_id: data.id,
              merchant_id: data.merchant_id,
              category: data.category,
            },
          })
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dealDetail.loadError', {}, { defaultValue: 'Failed to load deal.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function handleSaveCoupon() {
    if (!deal || savingCoupon) return
    setSavingCoupon(true)
    setSaveMessage(null)
    try {
      const res = await http.post<{ redemptions?: { id?: string }[]; total_amount?: number }>(
        '/redemptions',
        { deal_id: deal.id, quantity: 1 },
      )
      const body = res?.data ?? res
      const redemption = Array.isArray(body?.redemptions) ? body.redemptions[0] : undefined
      setDeal((current) => (current ? { ...current, saved: true } : current))
      void track({
        name: 'coupon.saved',
        properties: {
          deal_id: deal.id,
          merchant_id: deal.merchant_id,
          redemption_id: redemption?.id,
        },
      })
      setSaveMessage(
        t('dealDetail.saveSuccess', {}, { defaultValue: 'Coupon saved to your account.' }),
      )
    } catch (e) {
      setSaveMessage(
        e instanceof Error
          ? e.message
          : t('dealDetail.saveError', {}, { defaultValue: 'Could not save coupon.' }),
      )
    } finally {
      setSavingCoupon(false)
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !deal)
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', align: 'center', gap: 'md' }))}
      >
        <p role="alert" className={cm.cn('text-error')}>
          {error ??
            t('dealDetail.unavailable', {}, { defaultValue: 'This deal is no longer available.' })}
        </p>
        <Link
          to="/deals"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
          )}
        >
          {t('dealDetail.browseAll', {}, { defaultValue: 'Browse all deals' })}
        </Link>
      </div>
    )

  const expiry = expiryInfo(deal.expires_at, t)
  const glyph = CATEGORY_GLYPH[deal.category] ?? 'local_offer'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <Link
        to="/deals"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('py', 1),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-primary transition-colors w-fit',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('dealDetail.back', {}, { defaultValue: 'All deals' })}
      </Link>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <article className={cm.cn('lg:col-span-7 space-y-6')}>
          <section
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'relative h-72 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-container/40 to-secondary-container/30',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-[10rem] text-primary/70')}
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 200" }}
            >
              {glyph}
            </span>
            <div className={cm.cn(cm.flex({ gap: 'xs' }), 'absolute top-5 left-5')}>
              <span
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-full bg-secondary text-on-secondary font-black uppercase tracking-widest',
                )}
              >
                {t(
                  'dealDetail.savingsBadge',
                  { pct: deal.discount_pct },
                  { defaultValue: '{{pct}}% off' },
                )}
              </span>
              {deal.hot && (
                <span
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-full bg-primary text-on-primary font-black uppercase tracking-widest urgent-pulse',
                  )}
                >
                  {t('dealDetail.hotBadge', {}, { defaultValue: '🔥 Hot' })}
                </span>
              )}
            </div>
          </section>

          <header className={cm.cn('space-y-3')}>
            <p
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-[10px] font-black uppercase tracking-widest text-primary',
              )}
            >
              <Link
                to={`/merchants/${deal.merchant_id}`}
                className={cm.cn('hover:underline', cm.sp('py', 2))}
              >
                {deal.merchant}
              </Link>
              <span aria-hidden="true">·</span>
              <span className={cm.cn('text-on-surface-variant')}>{deal.category}</span>
            </p>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-on-surface',
              )}
            >
              {deal.title}
            </h1>
            <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
              <span
                className={cm.cn(
                  'text-5xl font-extrabold tabular-nums tracking-tight text-primary',
                )}
              >
                {fmtUsd(deal.deal_price_cents)}
              </span>
              {deal.original_price_cents > deal.deal_price_cents && (
                <span
                  className={cm.cn('text-xl tabular-nums line-through text-on-surface-variant')}
                >
                  {fmtUsd(deal.original_price_cents)}
                </span>
              )}
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-xl uppercase tracking-widest w-fit',
                expiry.tone === 'urgent'
                  ? 'bg-primary/15 text-primary'
                  : expiry.tone === 'warning'
                    ? 'bg-tertiary/15 text-tertiary'
                    : 'bg-surface-container text-on-surface-variant',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                schedule
              </span>
              {expiry.label}
              <span
                className={cm.cn(
                  'text-on-surface-variant font-medium normal-case ml-1 tracking-normal',
                )}
              >
                · {fmtDate(deal.expires_at)}
              </span>
            </div>
          </header>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 space-y-3',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('dealDetail.aboutHeading', {}, { defaultValue: 'About this deal' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {deal.description}
            </p>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dealDetail.finePrintHeading', {}, { defaultValue: 'Fine print' })}
            </h3>
            <ul className={cm.cn('space-y-2', cm.textSize('sm'), 'text-on-surface-variant')}>
              {deal.fine_print.map((line, i) => (
                <li key={i} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'material-symbols-outlined text-base text-on-surface-variant/60 shrink-0 pt-0.5',
                    )}
                  >
                    chevron_right
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <aside className={cm.cn('lg:col-span-5 space-y-4 lg:sticky lg:top-24 self-start')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 space-y-5',
            )}
          >
            <header className={cm.cn(cm.textCenter)}>
              <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
                {t('dealDetail.redemptionEyebrow', {}, { defaultValue: 'Redeem in store' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight',
                )}
              >
                {t('dealDetail.redemptionHeading', {}, { defaultValue: 'Your coupon code' })}
              </h2>
            </header>

            <CouponCodeBlock
              code={deal.redemption_code}
              caption={t('dealDetail.codeCaption', {}, { defaultValue: 'Show at the counter' })}
              showQr
            />

            {deal.saved ? (
              <Link
                to="/my-coupons"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'w-full rounded-full border-2 border-primary bg-primary/10 text-primary uppercase tracking-wider',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  bookmark_added
                </span>
                {t('dealDetail.savedCta', {}, { defaultValue: 'Saved — view in My Coupons' })}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSaveCoupon}
                disabled={savingCoupon}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'w-full rounded-full border-2 border-outline-variant/40 hover:border-primary hover:bg-primary/5 text-on-surface transition-colors uppercase tracking-wider disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  bookmark
                </span>
                {savingCoupon
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('dealDetail.saveCta', {}, { defaultValue: 'Save coupon' })}
              </button>
            )}

            {saveMessage ? (
              <p
                role="status"
                className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}
              >
                {saveMessage}
              </p>
            ) : null}

            <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'dealDetail.peopleSaved',
                { count: deal.saved_count },
                { defaultValue: '{{count}} people saved this deal' },
              )}
            </p>
          </div>

          <Link
            to={`/merchants/${deal.merchant_id}`}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ align: 'center', gap: 'md' }),
              'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 hover:border-primary/40 transition-colors',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-12 w-12 rounded-full bg-primary/15 text-primary',
              )}
              aria-hidden="true"
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                storefront
              </span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('dealDetail.merchantEyebrow', {}, { defaultValue: 'Merchant' })}
              </p>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('extrabold'), 'truncate')}>
                {deal.merchant}
              </p>
            </div>
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            >
              chevron_right
            </span>
          </Link>
        </aside>
      </div>
    </div>
  )
}
