import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AnnotationPin2() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // A real button (mirrors AnnotationPin3): hover-only pins are unreachable
  // on touch screens — tap/click toggles the selected ring.
  const [selected, setSelected] = React.useState(false)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={t(
        'annotationPin2.pinLabel',
        { number: 2 },
        { defaultValue: 'Annotation pin {{number}}' },
      )}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        'absolute top-[50%] left-[55%] group',
      )}
      onClick={() => setSelected((s) => !s)}
    >
      <div
        className={cm.cn(
          cm.w(7),
          cm.h(7),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'bg-tertiary border-2 text-on-tertiary font-label shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10 group-hover:scale-110 transition-transform',
          selected ? 'border-tertiary ring-2 ring-tertiary/60' : 'border-surface',
        )}
      >
        {t('annotationPin2.pinNumber', { number: 2 }, { defaultValue: '{{number}}' })}
      </div>
      <div
        className={cm.cn(
          cm.w(16),
          'h-[1px] border-t border-dashed border-tertiary/50 -ml-14 mt-3.5 z-0 absolute',
        )}
      ></div>
    </button>
  )
}

export default AnnotationPin2
export { AnnotationPin2 }
