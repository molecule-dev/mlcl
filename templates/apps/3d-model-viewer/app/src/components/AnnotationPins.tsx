import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AnnotationPins() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [activePin, setActivePin] = useState<number | null>(null)
  const handlePinClick = (pin: number) => setActivePin(activePin === pin ? null : pin)
  return (
    <>
      {/* Annotation Pins */}
      {/* Pin 1 */}
      <button
        type="button"
        aria-pressed={activePin === 1}
        aria-label={t(
          'annotationPins.pinLabel',
          { number: 1 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.cursorPointer,
          'absolute top-[30%] left-[45%] group',
        )}
        onClick={() => handlePinClick(1)}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.w(7),
            cm.h(7),
            'bg-tertiary border-2 border-surface text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
          )}
        >
          1
        </div>
        <div
          className={cm.cn(cm.h(16), 'w-[1px] border-l border-dashed border-tertiary/50 -mt-2 z-0')}
        ></div>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            activePin === 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'absolute top-8 left-4 bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/15 rounded-lg shadow-2xl shadow-black/40 min-w-[150px] transition-all duration-200 pointer-events-none z-20',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 1),
              'font-label text-tertiary block uppercase tracking-wider',
            )}
          >
            {t('annotationPins.pin1Name', {}, { defaultValue: 'Horn Base' })}
          </span>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-body')}>
            {t(
              'annotationPins.stressPointsDetected',
              { level: 3 },
              { defaultValue: 'Subdivision level {{level}} stress points detected.' },
            )}
          </p>
        </div>
      </button>
      {/* Pin 2 */}
      <button
        type="button"
        aria-pressed={activePin === 2}
        aria-label={t(
          'annotationPins.pinLabel',
          { number: 2 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.cursorPointer,
          'absolute top-[50%] left-[55%] group',
        )}
        onClick={() => handlePinClick(2)}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.w(7),
            cm.h(7),
            'bg-tertiary border-2 border-surface text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
          )}
        >
          2
        </div>
        <div
          className={cm.cn(
            cm.w(16),
            'h-[1px] border-t border-dashed border-tertiary/50 -ml-14 mt-3.5 z-0 absolute',
          )}
        ></div>
      </button>
      {/* Pin 3 */}
      <button
        type="button"
        aria-pressed={activePin === 3}
        aria-label={t(
          'annotationPins.pinLabel',
          { number: 3 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.cursorPointer,
          'absolute top-[65%] left-[40%] group',
        )}
        onClick={() => handlePinClick(3)}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.w(7),
            cm.h(7),
            'bg-tertiary border-2 border-surface text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
          )}
        >
          3
        </div>
        <div
          className={cm.cn(
            cm.h(12),
            'w-[1px] border-l border-dashed border-tertiary/50 mb-7 z-0 absolute bottom-0',
          )}
        ></div>
      </button>
      {/* Pin 4 */}
      <button
        type="button"
        aria-pressed={activePin === 4}
        aria-label={t(
          'annotationPins.pinLabel',
          { number: 4 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.cursorPointer,
          'absolute top-[40%] left-[35%] group',
        )}
        onClick={() => handlePinClick(4)}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.w(7),
            cm.h(7),
            'bg-tertiary border-2 border-surface text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
          )}
        >
          4
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            activePin === 4 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'absolute top-8 left-4 bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/15 rounded-lg shadow-2xl shadow-black/40 min-w-[150px] transition-all duration-200 pointer-events-none z-20',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 1),
              'font-label text-tertiary block uppercase tracking-wider',
            )}
          >
            {t('annotationPins.pin4Name', {}, { defaultValue: 'Edge Profile' })}
          </span>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-body')}>
            {t(
              'annotationPins.pin4Status',
              {},
              { defaultValue: 'Curvature deviation within tolerance.' },
            )}
          </p>
        </div>
      </button>
    </>
  )
}

export default AnnotationPins
export { AnnotationPins }
