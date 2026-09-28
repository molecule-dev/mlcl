import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DailyStatsTriadProps {
  hearts: number
  heartsMax: number
  wordsLearned: number
  minutesPracticed: number
}

/**
 * Triad of compact KPI cards — hearts left, words learned, minutes today.
 * Each card uses a colored left-accent bar, uppercase 10px font-black label,
 * 3xl extrabold value, and a Material Symbols icon chip on the right.
 *
 * Translated from the personal-finance KPI-row pattern with the
 * banking-dashboard AccountsTriad icon-chip treatment.
 */
export function DailyStatsTriad({
  hearts,
  heartsMax,
  wordsLearned,
  minutesPracticed,
}: DailyStatsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const items = [
    {
      key: 'hearts',
      label: t('dailyStatsTriad.heartsLabel', {}, { defaultValue: 'Hearts' }),
      value: t(
        'dailyStatsTriad.heartsValue',
        { current: hearts, max: heartsMax },
        { defaultValue: '{{current}}/{{max}}' },
      ),
      hint: t('dailyStatsTriad.heartsHint', {}, { defaultValue: 'Refill at each lesson start' }),
      icon: 'favorite',
      accent: 'border-l-red-500',
      tint: 'text-error',
    },
    {
      key: 'words',
      label: t('dailyStatsTriad.wordsLabel', {}, { defaultValue: 'Words mastered' }),
      value: wordsLearned.toLocaleString(),
      hint: t('dailyStatsTriad.wordsMasteryHint', {}, { defaultValue: 'Words at mastery 4+' }),
      icon: 'auto_stories',
      accent: 'border-l-primary',
      tint: 'text-primary',
    },
    {
      key: 'minutes',
      label: t('dailyStatsTriad.minutesLabel', {}, { defaultValue: 'Minutes today' }),
      value: t(
        'dailyStatsTriad.minutesValue',
        { count: minutesPracticed },
        { defaultValue: '{{count}} min' },
      ),
      hint: t('dailyStatsTriad.minutesHint', {}, { defaultValue: 'From today’s exercises' }),
      icon: 'schedule',
      accent: 'border-l-secondary',
      tint: 'text-secondary',
    },
  ] as const

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-3')}>
      {items.map((item) => (
        <div
          key={item.key}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform',
            cm.accentCard({ tone: 'custom' }),
          )}
          style={{
            ['--mol-accent' as string]: `var(--color-${item.accent.replace(/^border-l-/, '')})`,
          }}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
            <p className={cm.accentCardLabel({ tone: 'custom' })}>{item.label}</p>
            <div className={cm.cn(cm.sp('p', 2), 'rounded-xl bg-surface-container-low', item.tint)}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {item.icon}
              </span>
            </div>
          </div>
          <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight tabular-nums')}>
            {item.value}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {item.hint}
          </p>
        </div>
      ))}
    </section>
  )
}

export default DailyStatsTriad
