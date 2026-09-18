import type { UserProfile } from '@molecule/app-auth'
import { createAuth, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

export function Home() {
  const cm = getClassMap()
  const t = useTranslate()
  const { user } = createAuth<UserProfile>()

  return (
    <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('home.greeting')}, {user()?.name || user()?.email || t('home.world')}!
      </h2>
    </div>
  )
}
