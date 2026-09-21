import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Backer {
  id: string
  name: string
  avatar_url?: string | null
}

interface BackerAvatarStackProps {
  backers: ReadonlyArray<Backer>
  totalCount: number
  /** How many to render before collapsing into a +N circle. */
  max?: number
}

const HUE_PALETTE = ['#0891b2', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0e7490']

/**
 * Overlapping avatar stack — 32px circles with 2px surface border, -8px
 * margin overlap, and a +N overflow chip. Used on CampaignDetail and
 * Backers pages.
 */
export function BackerAvatarStack({ backers, totalCount, max = 5 }: BackerAvatarStackProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = backers.slice(0, max)
  const overflow = Math.max(0, totalCount - visible.length)

  return (
    <div className={cm.flex({ align: 'center' })}>
      <div className={cm.flex({ align: 'center' })}>
        {visible.map((b, i) => (
          <div
            key={b.id}
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'overflow-hidden border-2 border-surface',
            )}
            style={{ marginLeft: i === 0 ? 0 : '-0.5rem', zIndex: visible.length - i }}
            title={b.name}
          >
            {b.avatar_url ? (
              <img
                alt={b.name}
                src={b.avatar_url}
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              />
            ) : (
              <div
                className={cm.cn(
                  cm.w('full'),
                  cm.h('full'),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-white',
                )}
                style={{ background: HUE_PALETTE[i % HUE_PALETTE.length] }}
              >
                {b.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'border-2 border-surface bg-surface-container text-on-surface-variant',
            )}
            style={{ marginLeft: '-0.5rem' }}
          >
            +{overflow}
          </div>
        )}
      </div>
      <span
        className={cm.cn(
          cm.sp('ml', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {t(
          'backerAvatarStack.summary',
          { count: totalCount },
          { defaultValue: totalCount === 1 ? '1 backer' : '{{count}} backers' },
        )}
      </span>
    </div>
  )
}

export default BackerAvatarStack
