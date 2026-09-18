import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AnnotationPin() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.cursorPointer,
        'absolute top-[30%] left-[45%] group',
      )}
    >
      <div
        className={cm.cn(
          cm.w(7),
          cm.h(7),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'bg-tertiary border-2 border-surface text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
        )}
      >
        {t('annotationPin.pinNumber', { number: 1 }, { defaultValue: '{{number}}' })}
      </div>
      <div
        className={cm.cn(cm.h(16), 'w-[1px] border-l border-dashed border-tertiary/50 -mt-2 z-0')}
      ></div>
      <div
        className={cm.cn(
          cm.sp('p', 3),
          'opacity-0 group-hover:opacity-100 absolute top-8 left-4 bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/15 rounded-lg shadow-2xl shadow-black/40 min-w-[150px] transition-all duration-200 pointer-events-none z-20',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 1),
            'font-label text-tertiary block uppercase tracking-wider',
          )}
        >
          {t('annotationPin.regionLabel', {}, { defaultValue: 'Horn Base' })}
        </span>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-body')}>
          {t(
            'annotationPin.stressPointNote',
            { level: 3 },
            { defaultValue: 'Subdivision level {{level}} stress points detected.' },
          )}
        </p>
      </div>
    </div>
  )
}

export default AnnotationPin
export { AnnotationPin }
