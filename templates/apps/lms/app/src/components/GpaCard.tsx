import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function GpaCard({ gpa }: { gpa?: string | null }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'md:col-span-1 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 relative overflow-hidden group',
      )}
    >
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w(24),
          cm.h(24),
          'absolute -right-4 -top-4 bg-primary/5 blur-2xl group-hover:scale-125 transition-transform duration-700',
        )}
      ></div>
      <h3
        className={cm.cn(
          cm.sp('mb', 6),
          'text-on-surface-variant font-label text-[10px] uppercase tracking-widest',
        )}
      >
        {t('gpaCard.title', {}, { defaultValue: 'CUMULATIVE GPA' })}
      </h3>
      <div className={cm.cn(cm.w(40), cm.h(40), 'relative')}>
        {/* Progress Ring */}
        <svg className={cm.cn(cm.w('full'), cm.h('full'), 'transform -rotate-90')}>
          <circle
            className={cm.cn('text-foreground-tertiary')}
            cx="80"
            cy="80"
            fill="transparent"
            r="70"
            stroke="currentColor"
            strokeWidth="8"
          ></circle>
          <circle
            className={cm.cn('text-primary-container')}
            cx="80"
            cy="80"
            fill="transparent"
            r="70"
            stroke="currentColor"
            strokeDasharray="440"
            strokeDashoffset={gpa ? Math.round(440 * (1 - Number(gpa) / 4)) : 440}
            strokeLinecap="round"
            strokeWidth="12"
          ></circle>
        </svg>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'absolute inset-0',
          )}
        >
          <span className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-headline')}>
            {gpa ?? t('gpaCard.placeholder', {}, { defaultValue: '—' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-tertiary',
            )}
          >
            {t('gpaCard.scale', { max: '4.0' }, { defaultValue: '/ {{max}}' })}
          </span>
        </div>
      </div>
    </div>
  )
}
export { GpaCard }
