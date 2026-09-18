import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginDivider() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.w('full'), cm.flex({ align: 'center' }), 'gap-4')}>
      <div className={cm.cn('h-[1px] flex-grow bg-surface-container-highest')}></div>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'text-outline uppercase tracking-widest',
        )}
      >
        {t('loginDivider.orContinueWith', {}, { defaultValue: 'or continue with' })}
      </span>
      <div className={cm.cn('h-[1px] flex-grow bg-surface-container-highest')}></div>
    </div>
  )
}

export default LoginDivider
export { LoginDivider }
