/**
 * Gradient hero card — total responses + change pill, with a small
 * sparkline preview. Used at the top of Surveys + the Landing-page
 * sample card.
 *
 * Translated from customer-support-chat InboxHeroCard / personal-finance
 * NetWorthCard with the Gauge indigo→coral palette and a NPS-flavored
 * value (responses today + average NPS this week).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ResponsesHeroCardProps {
  /** Responses captured this week. */
  responsesThisWeek: number
  /** Pre-formatted change vs. last week (e.g. "+18% vs last week"). */
  changeLabel: string
  /** Average NPS score across active surveys (-100..100). */
  npsAverage: number
  /** Pre-formatted average completion time (e.g. "2m 41s"). */
  avgCompletion: string
}

function ResponsesHeroCard({
  responsesThisWeek,
  changeLabel,
  npsAverage,
  avgCompletion,
}: ResponsesHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formatted = responsesThisWeek.toLocaleString()
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
          {t('responsesHeroCard.title', {}, { defaultValue: 'Responses captured this week' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 4 }), 'flex-wrap')}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>{formatted}</span>
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
            <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
              trending_up
            </span>
            {changeLabel}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            'text-white/85 max-w-md leading-relaxed',
          )}
        >
          {t(
            'responsesHeroCard.subtitle',
            { time: avgCompletion },
            {
              defaultValue:
                'Average response takes {{time}} — keep questions tight to keep momentum.',
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
            {t('responsesHeroCard.npsLabel', {}, { defaultValue: 'Average NPS' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 1 }), cm.sp('mt', 1))}>
            <span className={cm.cn('text-3xl font-extrabold tracking-tight')}>{npsAverage}</span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-white/80')}>
              /100
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.h(20), 'min-w-[200px] opacity-50')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,80 Q40,72 80,55 T160,40 T240,48 T320,28 T400,18 L400,100 L0,100 Z"
              fill="white"
              fillOpacity="0.3"
            />
            <path
              d="M0,80 Q40,72 80,55 T160,40 T240,48 T320,28 T400,18"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div
        aria-hidden="true"
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
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

export default ResponsesHeroCard
export { ResponsesHeroCard }
