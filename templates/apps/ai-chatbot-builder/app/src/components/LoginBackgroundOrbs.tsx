import { getClassMap } from '@molecule/app-ui'

function LoginBackgroundOrbs() {
  const cm = getClassMap()
  return (
    <>
      {/* Background Decorative Orbs (The "Neural Nodes") */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-tertiary-container neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-secondary-container neural-orb',
        )}
      ></div>
    </>
  )
}
export default LoginBackgroundOrbs
export { LoginBackgroundOrbs }
