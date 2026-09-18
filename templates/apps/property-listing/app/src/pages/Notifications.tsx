// Boilerplate page — scaffolded automatically. Replace placeholder with
// real notification feed wired to the backend.

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <main
      data-mol-id="page-notifications"
      className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 8))}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      </h1>
      <p className={cm.textMuted}>
        {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
      </p>
    </main>
  )
}

export default Notifications
