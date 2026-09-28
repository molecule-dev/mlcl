/**
 * Editorial deal card — hot/expiring badge, scissor-cut bottom edge, big
 * discount percent, strikethrough original price, expiry timer.
 *
 * Translated from online-store's ProductCard.tsx and CategoryProductCard
 * family — we keep the rounded-xl shadow + group-hover lift, but swap the
 * product image for a category emoji "splash" tile and add the scissor-cut
 * dashed bottom edge that defines the Snagr coupon vibe (per DESIGN.md).
 */
import { Link } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface DealCardDeal {
  id: string
  title: string
  merchant: string
  category: string
  discount_pct: number
  original_price_cents: number
  deal_price_cents: number
  expires_at: string
  hot: boolean
  saved_count: number
}

export interface DealCardProps {
  deal: DealCardDeal
  /** Render as a `<Link to="/deals/:id">` (default true). */
  linked?: boolean
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function expiresIn(
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

const CATEGORY_GLYPH: Record<string, string> = {
  Restaurants: 'restaurant',
  Beauty: 'spa',
  Fitness: 'fitness_center',
  Activities: 'hiking',
  Online: 'shopping_bag',
  Services: 'home_repair_service',
}

export function DealCard({ deal, linked = true }: DealCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const expiry = expiresIn(deal.expires_at, t)
  const glyph = CATEGORY_GLYPH[deal.category] ?? 'local_offer'

  const inner = (
    <article
      data-mol-id={`deal-card-${deal.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm',
        'border border-outline-variant/30',
        'transition-all hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'relative h-36 overflow-hidden bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined text-6xl text-primary/70 transition-transform group-hover:scale-110',
          )}
          aria-hidden="true"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
        >
          {glyph}
        </span>

        <div className={cm.cn(cm.flex({ gap: 'xs' }), 'absolute top-3 left-3')}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-full bg-secondary text-on-secondary font-black uppercase tracking-wider',
            )}
          >
            {t(
              'dealCard.savingsBadge',
              { pct: deal.discount_pct },
              { defaultValue: '{{pct}}% off' },
            )}
          </span>
          {deal.hot && (
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-primary text-on-primary font-black uppercase tracking-wider urgent-pulse',
              )}
            >
              {t('dealCard.hotBadge', {}, { defaultValue: '🔥 Hot' })}
            </span>
          )}
        </div>
      </div>

      <div
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('pt', 4),
          cm.sp('pb', 6),
          'space-y-2 scissor-cut-bottom',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {deal.merchant}
        </p>
        <h3
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('semibold'),
            'leading-snug line-clamp-2 text-on-surface',
          )}
        >
          {deal.title}
        </h3>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('extrabold'),
              'tabular-nums text-primary',
            )}
          >
            {fmtUsd(deal.deal_price_cents)}
          </span>
          {deal.original_price_cents > deal.deal_price_cents && (
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'tabular-nums line-through text-on-surface-variant',
              )}
            >
              {fmtUsd(deal.original_price_cents)}
            </span>
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            'pt-1 text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'uppercase tracking-widest',
              expiry.tone === 'urgent'
                ? 'text-error'
                : expiry.tone === 'warning'
                  ? 'text-error'
                  : 'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              schedule
            </span>
            {expiry.label}
          </span>
          <span>
            {t(
              'dealCard.savedCount',
              { count: deal.saved_count },
              { defaultValue: '{{count}} saved' },
            )}
          </span>
        </div>
      </div>
    </article>
  )

  return linked ? (
    <Link to={`/deals/${deal.id}`} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}
