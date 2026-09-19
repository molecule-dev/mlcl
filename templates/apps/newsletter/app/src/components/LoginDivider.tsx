import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginDivider() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('py', 4), 'relative')}>
      <div className={cm.cn(cm.flex1, 'border-t border-outline-variant/20')}></div>
      <span
        className={cm.cn(
          cm.sp('mx', 4),
          'flex-shrink font-sans-ui text-[0.7rem] uppercase tracking-[0.2em] text-foreground-secondary',
        )}
      >
        {t('common.or', {}, { defaultValue: 'or' })}
      </span>
      <div className={cm.cn(cm.flex1, 'border-t border-outline-variant/20')}></div>
    </div>
  )
}

export default LoginDivider
export { LoginDivider }
