import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_DESCRIPTION, WEBSITE_URL } from '../branding.js'

/**
 * About page — reachable at `/about`, where the Footer's "About" link points.
 * Every app ships one so the footer link is never a dead end. Edit freely, or
 * replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
 * is your public site — when set, this page links out to it; leave it empty and
 * the outbound link simply doesn't render.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
      </h1>
      <p className={cm.cn(cm.sp('pt', 4), cm.textMuted)}>
        {t('about.description', undefined, { defaultValue: APP_DESCRIPTION })}
      </p>
      {WEBSITE_URL ? (
        <p className={cm.sp('pt', 6)}>
          <a className={cm.link} href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
            {t('about.visitWebsite', undefined, { defaultValue: 'Visit our website →' })}
          </a>
        </p>
      ) : null}
    </div>
  )
}
