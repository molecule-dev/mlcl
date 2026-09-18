import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * 4:3 image-first card for browsing box themes. Status badge top-left,
 * optional "New" / "Limited Edition" corner ribbon, retail value bar at
 * the bottom of the content area.
 *
 * Translated from online-store/ArrivalCard.tsx (image-above-title pattern,
 * §20.1) and crm/ContactRow's status-pill treatment, fused with DESIGN.md
 * Box Card spec (16px radius, 4:3 image, corner ribbon).
 */
export interface BoxTheme {
  id: string
  slug: string
  name: string
  tagline: string
  imageUrl: string
  imageAlt: string
  retailValueLabel: string
  monthlyPriceLabel: string
  itemCount: number
  badge?: 'new' | 'limited' | null
  status?: 'available' | 'subscribed' | 'sold_out'
}

const ribbonStyles: Record<NonNullable<BoxTheme['badge']>, { bg: string; label: string }> = {
  new: { bg: 'bg-primary text-on-primary', label: 'NEW' },
  limited: { bg: 'bg-secondary text-on-secondary', label: 'LIMITED' },
}

const statusStyles: Record<NonNullable<BoxTheme['status']>, { bg: string; label: string }> = {
  available: { bg: 'bg-surface text-on-surface', label: 'AVAILABLE' },
  subscribed: { bg: 'bg-success text-on-success', label: 'SUBSCRIBED' },
  sold_out: { bg: 'bg-surface-container-highest text-on-surface', label: 'SOLD OUT' },
}

export interface BoxThemeCardProps {
  box: BoxTheme
  /** Override the destination link. Defaults to `/boxes/${box.id}`. */
  to?: string
}

export function BoxThemeCard({ box, to }: BoxThemeCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ribbon = box.badge ? ribbonStyles[box.badge] : null
  const status = box.status ? statusStyles[box.status] : null

  return (
    <Link
      to={to ?? `/boxes/${box.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
      )}
    >
      <div className={cm.cn('relative aspect-[4/3] overflow-hidden bg-primary-fixed/20')}>
        <img
          src={box.imageUrl}
          alt={box.imageAlt}
          className={cm.cn(
            'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105',
          )}
        />
        {status && (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.roundedFull,
              cm.flex({ align: 'center', gap: 'xs' }),
              'absolute top-3 left-3 text-[10px] uppercase tracking-widest shadow-sm',
              status.bg,
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')}>
              {box.status === 'subscribed'
                ? 'check_circle'
                : box.status === 'sold_out'
                  ? 'block'
                  : 'inventory_2'}
            </span>
            {t(`boxThemeCard.status.${box.status}`, {}, { defaultValue: status.label })}
          </span>
        )}
        {ribbon && (
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'absolute -right-10 top-6 rotate-45 text-[10px] tracking-widest text-center w-36 py-1 shadow-md',
              ribbon.bg,
            )}
          >
            {t(`boxThemeCard.badge.${box.badge}`, {}, { defaultValue: ribbon.label })}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.sp('p', 5), cm.flex({ direction: 'col', gap: 'sm' }))}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
            <h3
              className={cm.cn(
                'text-lg font-extrabold tracking-tight text-on-surface group-hover:text-primary transition-colors',
              )}
            >
              {box.name}
            </h3>
            <p className={cm.cn('text-sm font-medium text-on-surface-variant line-clamp-2')}>
              {box.tagline}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }), 'shrink-0')}>
            <span
              className={cm.cn('text-xl font-extrabold text-primary tracking-tight tabular-nums')}
            >
              {box.monthlyPriceLabel}
            </span>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('boxThemeCard.perMonth', {}, { defaultValue: '/ month' })}
            </span>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('mt', 2),
            cm.sp('pt', 3),
            'border-t border-outline-variant/30',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-xs font-bold text-success',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>redeem</span>
            {t(
              'boxThemeCard.retailValue',
              { value: box.retailValueLabel },
              { defaultValue: 'Retail value {{value}}' },
            )}
          </span>
          <span
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t(
              'boxThemeCard.itemCount',
              { count: box.itemCount },
              { defaultValue: '{{count}} items' },
            )}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default BoxThemeCard
