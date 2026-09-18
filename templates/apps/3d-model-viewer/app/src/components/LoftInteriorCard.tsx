import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoftInteriorCard() {
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
        <div
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 right-3 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded text-on-surface z-10',
          )}
        >
          {t('loftInteriorCard.format', { format: 'FBX' }, { defaultValue: '{{format}}' })}
        </div>
        <div
          className={cm.cn(
            cm.sp('py', 1),
            cm.roundedFull,
            'absolute bottom-3 left-3 bg-secondary-container/90 backdrop-blur-sm text-on-secondary-container font-mono text-[11px] px-2.5 z-10',
          )}
        >
          {t(
            'loftInteriorCard.polyCount',
            { count: '18,400' },
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
          data-alt="detailed 3d architectural interior render of a modern living room"
          src="https://picsum.photos/seed/LoftInteriorCard-1/1200/800"
        />
      </div>
      <div className={cm.sp('p', 4)}>
        <h4 className={cm.cn(cm.fontWeight('medium'), 'text-on-surface truncate')}>
          {t('loftInteriorCard.title', {}, { defaultValue: 'Modern Loft Interior' })}
        </h4>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'loftInteriorCard.lastEdited',
            { when: '3 days ago' },
            { defaultValue: 'Edited {{when}}' },
          )}
        </p>
      </div>
    </div>
  )
}

export default LoftInteriorCard
export { LoftInteriorCard }
