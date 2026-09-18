/**
 * Activity feed of price drops / back-in-stock / alert-fired events with
 * an icon pill, title, retailer caption, time-ago, and an inline drop
 * pill showing the new vs old price. Used on Dashboard ("Recent drops")
 * and Notifications ("Activity").
 *
 * Pattern source: crm/ActivityFeed.tsx + personal-finance/ActivityRow.tsx —
 * uppercase eyebrow, divide-y rows with leading icon pill, primary-muted
 * meta row, and a right-aligned numeric column. Tone-coded backgrounds
 * differentiate drop vs rise vs alert per DESIGN.md's "Notification Toast"
 * spec.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtRelative, fmtUsd } from '../lib/unwrap.js'

export interface PriceDropEvent {
  id: string
  /** Required so we can deep-link back to the product. */
  product_id: string
  product_name: string
  retailer: string
  /** 'drop' | 'rise' | 'restock' | 'alert' */
  kind: 'drop' | 'rise' | 'restock' | 'alert'
  old_price_cents: number
  new_price_cents: number
  ts: string
}

export interface PriceDropFeedProps {
  events: PriceDropEvent[]
  eyebrow?: string
  heading?: string
  /** "View all" link target. */
  viewAllTo?: string
  /** Empty-state message. */
  emptyLabel?: string
}

const KIND_GLYPH: Record<PriceDropEvent['kind'], string> = {
  drop: 'trending_down',
  rise: 'trending_up',
  restock: 'inventory',
  alert: 'notifications_active',
}

const KIND_TONE: Record<PriceDropEvent['kind'], string> = {
  drop: 'bg-secondary/15 text-secondary',
  rise: 'bg-error/15 text-error',
  restock: 'bg-primary/15 text-primary',
  alert: 'bg-tertiary/15 text-tertiary',
}

export function PriceDropFeed({
  events,
  eyebrow,
  heading,
  viewAllTo,
  emptyLabel,
}: PriceDropFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      data-mol-id="price-drop-feed"
      className={cm.cn(
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        'overflow-hidden',
      )}
    >
      {(eyebrow || heading || viewAllTo) && (
        <header
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 5),
            cm.flex({ align: 'baseline', justify: 'between' }),
            'border-b border-outline-variant/40',
          )}
        >
          <div>
            {eyebrow && (
              <p
                className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}
              >
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h2>
            )}
          </div>
          {viewAllTo && (
            <Link
              to={viewAllTo}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          )}
        </header>
      )}
      {events.length === 0 ? (
        <div className={cm.cn(cm.sp('p', 8), 'text-center text-on-surface-variant')}>
          {emptyLabel ?? t('priceDropFeed.empty', {}, { defaultValue: 'No activity yet.' })}
        </div>
      ) : (
        <ul className={cm.cn('divide-y divide-outline-variant/30')}>
          {events.map((e) => {
            const delta = e.old_price_cents - e.new_price_cents
            const pct = e.old_price_cents > 0 ? Math.round((delta / e.old_price_cents) * 100) : 0
            return (
              <li key={e.id}>
                <Link
                  to={`/products/${e.product_id}`}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'transition-colors hover:bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 shrink-0 rounded-full',
                      KIND_TONE[e.kind],
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')}>
                      {KIND_GLYPH[e.kind]}
                    </span>
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'truncate text-on-surface',
                      )}
                    >
                      {e.product_name}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'mt-0.5 text-on-surface-variant',
                      )}
                    >
                      <span className={cm.cn('font-medium')}>{e.retailer}</span>
                      <span aria-hidden="true">•</span>
                      <span>{fmtRelative(e.ts)}</span>
                    </p>
                  </div>
                  <div className={cm.cn('flex flex-col items-end')}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('extrabold'),
                        'tabular-nums',
                        e.kind === 'rise' ? 'text-error' : 'text-on-surface',
                      )}
                    >
                      {fmtUsd(e.new_price_cents)}
                    </span>
                    {e.old_price_cents !== e.new_price_cents && (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'mt-0.5 font-bold uppercase tracking-wider',
                          e.kind === 'rise' ? 'text-error' : 'text-secondary',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          {e.kind === 'rise' ? 'trending_up' : 'trending_down'}
                        </span>
                        {e.kind === 'rise' ? `+${Math.abs(pct)}%` : `-${pct}%`}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
