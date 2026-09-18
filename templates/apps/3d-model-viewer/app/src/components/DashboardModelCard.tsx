import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DashboardModelCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.cursorPointer,
        'bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(15,15,35,0.06)] min-w-[320px] snap-start group transition-transform duration-200 hover:-translate-y-1',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'aspect-[16/10] bg-on-background relative overflow-hidden',
        )}
      >
        {/* Format Badge */}
        <div
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 right-3 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded text-on-surface z-10',
          )}
        >
          {t('dashboardModelCard.format', { format: 'GLB' }, { defaultValue: '{{format}}' })}
        </div>
        {/* Polycount Badge */}
        <div
          className={cm.cn(
            cm.sp('py', 1),
            cm.roundedFull,
            'absolute bottom-3 left-3 bg-secondary-container/90 backdrop-blur-sm text-on-secondary-container font-mono text-[11px] px-2.5 z-10',
          )}
        >
          {t(
            'dashboardModelCard.polycount',
            { count: '42,051' },
            { defaultValue: '{{count}} polys' },
          )}
        </div>
        <img
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500',
          )}
          alt=""
          data-alt="abstract 3d geometric shapes floating in dark studio lighting"
          src="https://picsum.photos/seed/DashboardModelCard-1/1200/800"
        />
      </div>
      <div className={cm.sp('p', 4)}>
        <h4 className={cm.cn(cm.fontWeight('medium'), 'text-on-surface truncate')}>
          {t('dashboardModelCard.title', {}, { defaultValue: 'Abstract Geometric Core' })}
        </h4>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'dashboardModelCard.lastEdited',
            { time: '2 hours' },
            { defaultValue: 'Edited {{time}} ago' },
          )}
        </p>
      </div>
    </div>
  )
}

export default DashboardModelCard
export { DashboardModelCard }
