import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginSignupLink() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.textCenter, cm.sp('pt', 6))}>
      <p className={cm.cn(cm.textSize('sm'), 'font-sans-ui text-on-surface-variant')}>
        {t('loginSignupLink.prompt', {}, { defaultValue: 'No account?' })}

        <Link className={cm.fv93c68d50} data-mol-id="link-create-account" to="/signup">
          {t('loginSignupLink.createAccount', {}, { defaultValue: 'Create one' })}
        </Link>
      </p>
    </div>
  )
}

export default LoginSignupLink
export { LoginSignupLink }
