import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginDivider() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.w('full'), cm.sp('my', 10))}>
      <div className={cm.cn(cm.flex1, 'h-px', 'bg-surface-container-high')}></div>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-outline')}>
        {t('login.orContinueWith', {}, { defaultValue: 'or continue with' })}
      </span>
      <div className={cm.cn('h-px', cm.flex1, 'bg-surface-container-high')}></div>
    </div>
  )
}

export default LoginDivider
export { LoginDivider }
