import { getClassMap } from '@molecule/app-ui'

function LoginBackground() {
  const cm = getClassMap()
  return (
    <div className={cm.fv315d7cc2}>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute -top-[12%] -left-[8%] w-[40%] h-[40%] bg-border/40 blur-[100px]',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-[35%] -right-[5%] w-[35%] h-[35%] bg-border-secondary/30 blur-[90px]',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute -bottom-[8%] right-[10%] w-[38%] h-[38%] bg-primary-fixed/15 blur-[110px]',
        )}
      ></div>
    </div>
  )
}

export default LoginBackground
export { LoginBackground }
