import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t(
          'home.world',
          {
            name:
              user?.name || user?.email || t('home.fallbackName', {}, { defaultValue: 'World' }),
          },
          { defaultValue: 'Hello {{name}}!' },
        )}
      </h2>
    </div>
  )
}
