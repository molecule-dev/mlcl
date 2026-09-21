/**
 * Horizontal-scroll editorial row of hot deals — uppercase eyebrow,
 * "view all" arrow link, snap-x scroll behavior, gradient fade on the
 * right edge. Used on Landing (curated demo data) and Dashboard (trending).
 *
 * Pattern source: online-store's StorefrontTrendingSection.tsx — same
 * eyebrow + sneaky-arrow heading + horizontal-scroll snap layout, swapped
 * for DealCard children.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface HotDealsRowProps {
  /** Eyebrow above the heading, e.g. "TRENDING NOW". */
  eyebrow: string
  /** Section heading. */
  heading: string
  /** "View all" link target; omit to hide. */
  viewAllTo?: string
  /** Pre-rendered DealCard list. */
  children: ReactNode
}

export function HotDealsRow({ eyebrow, heading, viewAllTo, children }: HotDealsRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section data-mol-id="hot-deals-row" className={cm.sp('py', 4)}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), cm.sp('mb', 5))}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {eyebrow}
          </p>
          <h2 className={cm.cn('mt-1 text-2xl font-extrabold tracking-tight text-on-surface')}>
            {heading}
          </h2>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline whitespace-nowrap',
            )}
          >
            {t('common.viewAll', {}, { defaultValue: 'View all' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        )}
      </header>

      <div
        className={cm.cn(
          cm.grid({ gap: 'md' }),
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {children}
      </div>
    </section>
  )
}
