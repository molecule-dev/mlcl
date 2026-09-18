/**
 * Gradient hero card — active conversations + on-target SLA pill, plus a
 * decorative inline SVG sparkline. Used at the top of the Inbox + the
 * Landing-page sample card. The frosted-glass change pill on the right
 * matches DESIGN.md "Quick Reply Chip" radii.
 *
 * Translated from personal-finance NetWorthCard with the
 * ai-customer-service-bot communications palette.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface InboxHeroCardProps {
  /** Active conversations across all channels right now. */
  activeConversations: number
  /** Pre-formatted change vs. last hour (e.g. "+12 since 9 AM"). */
  changeLabel: string
  /** SLA percentage hit this week (0-100). */
  slaPercent: number
  /** Pre-formatted average first response time (e.g. "2m 14s"). */
  avgFirstResponse: string
}

function InboxHeroCard({
  activeConversations,
  changeLabel,
  slaPercent,
  avgFirstResponse,
}: InboxHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[280px] bg-gradient-to-br from-primary to-secondary rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/80',
          )}
        >
          {t('inboxHeroCard.title', {}, { defaultValue: 'Active conversations' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 4 }), 'flex-wrap')}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>
            {activeConversations}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>forum</span>
            {changeLabel}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/80 max-w-md')}>
          {t(
            'inboxHeroCard.subtitle',
            { time: avgFirstResponse },
            {
              defaultValue:
                'Customers are getting their first reply in {{time}} on average — keep the cadence going.',
            },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('mt', 8),
          'relative z-10 flex-wrap gap-6',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {t('inboxHeroCard.slaLabel', {}, { defaultValue: 'SLA this week' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 1 }), cm.sp('mt', 1))}>
            <span className={cm.cn('text-3xl font-extrabold tracking-tight')}>{slaPercent}</span>
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-white/80')}>
              %
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.h(20), 'min-w-[200px] opacity-50')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0,80 Q40,70 80,60 T160,40 T240,55 T320,30 T400,20 L400,100 L0,100 Z"
              fill="white"
              fillOpacity="0.3"
            />
            <path
              d="M0,80 Q40,70 80,60 T160,40 T240,55 T320,30 T400,20"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-12 top-8 bg-surface/15 blur-xl',
        )}
      />
    </div>
  )
}

export default InboxHeroCard
export { InboxHeroCard }
