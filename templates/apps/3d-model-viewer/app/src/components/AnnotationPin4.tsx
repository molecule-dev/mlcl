import { getClassMap } from '@molecule/app-ui'

function AnnotationPin4() {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.cursorPointer,
        'absolute top-[40%] left-[35%] group',
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
        4
      </div>
    </div>
  )
}

export default AnnotationPin4
export { AnnotationPin4 }
