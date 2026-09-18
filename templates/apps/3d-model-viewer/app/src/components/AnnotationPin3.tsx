import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AnnotationPin3() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [selected, setSelected] = React.useState(false)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={t(
        'annotationPin3.pinLabel',
        { number: 3 },
        { defaultValue: 'Annotation pin {{number}}' },
      )}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.cursorPointer,
        'absolute top-[65%] left-[40%] group',
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
        3
      </div>
      <div
        className={cm.cn(
          cm.h(12),
          'w-[1px] border-l border-dashed border-tertiary/50 mb-7 z-0 absolute bottom-0',
        )}
      ></div>
    </button>
  )
}

export default AnnotationPin3
export { AnnotationPin3 }
