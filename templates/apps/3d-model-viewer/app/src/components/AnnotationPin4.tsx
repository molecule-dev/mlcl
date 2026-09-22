import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AnnotationPin4() {
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
        'annotationPin4.pinLabel',
        { number: 4 },
        { defaultValue: 'Annotation pin {{number}}' },
      )}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.cursorPointer,
        'absolute top-[40%] left-[35%] group',
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
        {t('annotationPin4.pinNumber', { number: 4 }, { defaultValue: '{{number}}' })}
      </div>
    </button>
  )
}

export default AnnotationPin4
export { AnnotationPin4 }
