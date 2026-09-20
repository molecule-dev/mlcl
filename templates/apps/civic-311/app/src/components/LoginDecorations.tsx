import { getClassMap } from '@molecule/app-ui'

function LoginDecorations() {
  const cm = getClassMap()
  return (
    <>
      {/* Decoration element */}
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w('1/3'),
          cm.h('1/3'),
          'fixed top-0 right-0 -z-10 bg-primary/5 blur-[120px] translate-x-1/2 -translate-y-1/2',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w('1/4'),
          cm.h('1/4'),
          'fixed bottom-0 left-0 -z-10 bg-secondary/5 blur-[100px] -translate-x-1/3 translate-y-1/3',
        )}
      ></div>
    </>
  )
}
export default LoginDecorations
export { LoginDecorations }
