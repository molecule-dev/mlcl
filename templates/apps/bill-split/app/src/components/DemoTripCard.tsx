import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Stitch auth-side demo card — the sample trip panel shown beside the auth
 * forms (Signup "Trip to Joshua Tree", Forgot "Portland Cabin Trip", Reset
 * "Tahoe Ski Weekend"). Purely presentational: it previews the app with the
 * demo world a new account is seeded into. The emoji sits in a fixed-size
 * wrapper tile per the glyph-sizing convention.
 */
export function DemoTripCard({
  emoji,
  name,
  meta,
  badge,
  balanceLabel,
  balance,
  balanceNote,
  avatars,
}: {
  emoji: string
  name: string
  meta: string
  badge?: string
  balanceLabel: string
  balance: string
  balanceNote?: string
  avatars?: string[]
}): ReactNode {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="auth-demo-trip"
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-low border border-outline-variant/30',
        cm.stack(3),
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-10 w-10 shrink-0 rounded-lg bg-surface-container-high text-lg',
            )}
            aria-hidden="true"
          >
            {emoji}
          </span>
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{name}</p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{meta}</p>
          </div>
        </div>
        {badge ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 2),
              cm.sp('py', 0.5),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'shrink-0 rounded-full bg-primary-container/60 text-on-primary-container',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              verified
            </span>
            {badge}
          </span>
        ) : null}
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl bg-surface border border-outline-variant/30',
        )}
      >
        <div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{balanceLabel}</p>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'text-primary tabular-nums',
            )}
          >
            {balance}
          </p>
          {balanceNote ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{balanceNote}</p>
          ) : null}
        </div>
        {avatars && avatars.length > 0 ? (
          <span className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')} aria-hidden="true">
            {avatars.map((initials) => (
              <span
                key={initials}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-7 w-7 rounded-full text-[10px] font-bold ring-2 ring-surface-container-low',
                  'bg-secondary-fixed text-on-secondary-fixed',
                )}
              >
                {initials}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'auth.demoTripNote',
          {},
          { defaultValue: 'A preview of the demo world waiting after you continue.' },
        )}
      </p>
    </div>
  )
}

export default DemoTripCard
