import { getClassMap } from '@molecule/app-ui'

function AnnotationPin2() {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        'absolute top-[50%] left-[55%] group',
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
        2
      </div>
      <div
        className={cm.cn(
          cm.w(16),
          'h-[1px] border-t border-dashed border-tertiary/50 -ml-14 mt-3.5 z-0 absolute',
        )}
      ></div>
    </div>
  )
}

export default AnnotationPin2
export { AnnotationPin2 }
