import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ActivitiesIntensityCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-gradient-to-br from-primary to-primary-container rounded-3xl text-white shadow-xl shadow-primary/20 relative overflow-hidden',
      )}
    >
      <div className={cm.fv7a8ff926}>
        <h4
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'opacity-80 uppercase tracking-widest',
          )}
        >
          {t('activitiesIntensityCard.title', {}, { defaultValue: 'Weekly Intensity' })}
        </h4>
        <div className={cm.cn(cm.flex({ align: 'end' }), cm.h(12), cm.sp('mb', 4), 'gap-1.5')}>
          <div className={cm.cn(cm.w('full'), 'bg-surface/20 rounded-t-sm h-1/2')}></div>
          <div className={cm.cn(cm.w('full'), 'bg-surface/40 rounded-t-sm h-3/4')}></div>
          <div className={cm.cn(cm.w('full'), 'bg-surface/20 rounded-t-sm h-1/4')}></div>
          <div className={cm.cn(cm.w('full'), 'bg-surface/60 rounded-t-sm h-full')}></div>
          <div className={cm.cn(cm.w('full'), 'bg-surface/30 rounded-t-sm h-1/2')}></div>
          <div className={cm.cn(cm.w('full'), 'bg-surface/80 rounded-t-sm h-2/3')}></div>
          <div className={cm.cn(cm.w('full'), 'bg-surface/10 rounded-t-sm h-1/4')}></div>
        </div>
        <p className={cm.cn(cm.fontWeight('medium'), 'text-[10px] leading-tight')}>
          {t(
            'activitiesIntensityCard.peakInsight',
            { peakDay: 'Wednesday', focusDay: 'Thursdays' },
            {
              defaultValue:
                'Peak activity detected on {{peakDay}}. AI suggests scheduling heavy focus tasks on {{focusDay}}.',
            },
          )}
        </p>
      </div>
      {/* Decorative circle */}
      <div
        className={cm.cn(
          cm.w(24),
          cm.h(24),
          cm.roundedFull,
          'absolute -right-8 -bottom-8 bg-surface/10 blur-2xl',
        )}
      ></div>
    </div>
  )
}

export default ActivitiesIntensityCard
export { ActivitiesIntensityCard }
