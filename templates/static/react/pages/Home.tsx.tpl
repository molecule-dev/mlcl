import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, APP_NAME } from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'

/** The front page. Prerendered to `dist/index.html` by `npm run build`. */
export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))} data-mol-id="home-page">
      <PageMeta title="" description={APP_DESCRIPTION} />
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('home.title', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
      <p className={cm.cn(cm.sp('pt', 4), cm.textMuted)}>
        {t('home.tagline', undefined, { defaultValue: APP_DESCRIPTION })}
      </p>
    </div>
  )
}
