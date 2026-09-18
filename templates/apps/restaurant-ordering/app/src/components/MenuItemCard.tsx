import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten_free' | 'spicy' | 'allergen'

export interface MenuItem {
  id: string
  name: string
  description?: string
  /** Unit price in cents. */
  priceCents: number
  /** Optional discount price in cents (renders both: strikethrough original + red discount). */
  discountCents?: number
  /** Image URL. Falls back to a gradient placeholder if missing. */
  imageUrl?: string
  /** Stable ordered list of dietary badges. */
  dietary?: ReadonlyArray<DietaryTag>
  /** When true, paints a translucent unavailable overlay. */
  unavailable?: boolean
  /** Optional category label (e.g. 'Appetizers'). */
  category?: string
}

interface MenuItemCardProps {
  item: MenuItem
  /** Optional click target — defaults to /menu/:id. */
  to?: string
}

const DIETARY_THEME: Record<DietaryTag, { letters: string; defaultLabel: string; bg: string }> = {
  vegetarian: { letters: 'V', defaultLabel: 'Vegetarian', bg: 'bg-success' },
  vegan: { letters: 'VG', defaultLabel: 'Vegan', bg: 'bg-success' },
  gluten_free: { letters: 'GF', defaultLabel: 'Gluten free', bg: 'bg-tertiary' },
  spicy: { letters: '🌶', defaultLabel: 'Spicy', bg: 'bg-error' },
  allergen: { letters: '!', defaultLabel: 'Allergen', bg: 'bg-warning' },
}

function fmtCents(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Bespoke menu item card — 4:3 image (or gradient fallback), title +
 * description with 2-line clamp, dietary badge row, price block bottom-
 * right with optional strikethrough discount, unavailable overlay.
 *
 * Pattern source: editorial card recipe (rounded-xl + shadow-sm + hover-
 * shadow + group-hover scale on imagery) from POLISHED-PATTERN-CATALOG
 * §3.1, adapted to the menu/category card pattern from online-store's
 * CategoryProductCard.
 */
export function MenuItemCard({ item, to }: MenuItemCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const onSale = typeof item.discountCents === 'number' && item.discountCents < item.priceCents
  const target = to ?? `/menu/${item.id}`

  return (
    <Link
      to={target}
      className={cm.cn(
        'block bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group relative',
        item.unavailable && 'opacity-90',
      )}
    >
      <div
        className={cm.cn(
          'relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-tertiary/20',
        )}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={cm.cn(
              'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
            )}
            loading="lazy"
          />
        ) : (
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'absolute inset-0')}
          >
            <span
              className={cm.cn('material-symbols-outlined text-6xl text-primary/40')}
              aria-hidden="true"
            >
              restaurant
            </span>
          </div>
        )}
        {item.category && (
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'absolute top-3 left-3 uppercase tracking-widest bg-surface/90 backdrop-blur-md text-primary',
            )}
          >
            {item.category}
          </span>
        )}
        {item.unavailable && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'absolute inset-0 bg-surface/70 backdrop-blur-sm',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface',
              )}
            >
              {t('menuItemCard.unavailable', {}, { defaultValue: 'Unavailable' })}
            </span>
          </div>
        )}
      </div>
      <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
        <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
          <h3
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'leading-snug line-clamp-2 font-display',
            )}
          >
            {item.name}
          </h3>
          <div className={cm.flex({ direction: 'col', align: 'end' })}>
            {onSale ? (
              <>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'line-through text-on-surface-variant tabular-nums',
                  )}
                >
                  {fmtCents(item.priceCents)}
                </span>
                <span
                  className={cm.cn(cm.textSize('lg'), 'font-extrabold text-error tabular-nums')}
                >
                  {fmtCents(item.discountCents!)}
                </span>
              </>
            ) : (
              <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tabular-nums')}>
                {fmtCents(item.priceCents)}
              </span>
            )}
          </div>
        </div>
        {item.description && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant line-clamp-2 leading-relaxed',
            )}
          >
            {item.description}
          </p>
        )}
        {item.dietary && item.dietary.length > 0 && (
          <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
            {item.dietary.map((tag) => {
              const theme = DIETARY_THEME[tag]
              return (
                <span
                  key={tag}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 0),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded text-on-primary uppercase tracking-widest',
                    theme.bg,
                  )}
                  title={t(`menuItemCard.dietary.${tag}`, {}, { defaultValue: theme.defaultLabel })}
                  aria-label={t(
                    `menuItemCard.dietary.${tag}`,
                    {},
                    { defaultValue: theme.defaultLabel },
                  )}
                >
                  {theme.letters}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </Link>
  )
}
