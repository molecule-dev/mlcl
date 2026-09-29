import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * The app's brand mark — the ONLY place the logo tile + wordmark render.
 *
 * Every surface (landing header, auth shell, drawer + mobile drawer
 * brand rows) consumes this component so the brand is byte-identical
 * across the app: the `inventory_2` glyph on the primary→secondary
 * gradient tile, the extrabold tracking-tight wordmark, the uppercase
 * INVENTORY CONTROL subtitle — all driven by `branding.ts` and the
 * brand tokens. Nothing else may render `APP_NAME` as a brand
 * (grep-enforced by scripts/verify-brand-consistency.mjs and asserted
 * per page by e2e via
 * [data-mol-id={footer ? "brand-wordmark-footer" : "brand-wordmark"}]).
 *
 * `as` renders the wrapping element: a router Link to `/` by default;
 * pass `as="span"` inside chrome that already provides its own link
 * (the drawer NavLinks keep their own targets).
 */
export function BrandWordmark({
  as = 'link',
  size = 'md',
  withSubtitle = false,
  invert = false,
  footer = false,
}: {
  as?: 'link' | 'span'
  size?: 'sm' | 'md' | 'lg'
  withSubtitle?: boolean
  /** for dark chrome: tile + ink on the dark surface (light text) */
  invert?: boolean
  /** footer lockup: carries brand-wordmark-footer so the per-page
      "exactly one brand-wordmark" e2e contract stays header-scoped */
  footer?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tileSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-10 w-10'
  const glyphSize = size === 'sm' ? 'text-[18px]' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-xl' : 'text-lg'
  const mark = (
    <span
      data-mol-id={footer ? 'brand-wordmark-footer' : 'brand-wordmark'}
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-xl bg-gradient-to-br from-primary to-secondary text-white shrink-0',
          invert ? 'shadow-lg shadow-primary/30' : '',
          tileSize,
        )}
      >
        <span className={cm.cn('material-symbols-outlined', glyphSize)} data-icon="inventory_2">
          inventory_2
        </span>
      </span>
      <span className={cm.cn('flex flex-col min-w-0')}>
        <span
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'tracking-tight leading-none truncate',
            textSize,
            invert ? 'text-white' : 'text-on-surface',
          )}
        >
          {APP_NAME}
        </span>
        {withSubtitle ? (
          <span
            className={cm.cn(
              'mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              invert ? 'text-white/60' : 'text-on-surface-variant',
            )}
          >
            {t(
              'inventoryManagementLayout.brandSubtitle',
              {},
              { defaultValue: 'Inventory Control' },
            )}
          </span>
        ) : null}
      </span>
    </span>
  )
  if (as === 'span') return mark
  return (
    <Link to="/" className={cm.cn('group shrink-0')} aria-label={APP_NAME}>
      {mark}
    </Link>
  )
}
