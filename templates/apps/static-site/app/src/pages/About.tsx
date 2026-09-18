import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, APP_NAME, WEBSITE_URL } from '../branding.js'
import { PageMeta } from '../components/PageMeta.js'

/**
 * About page — `/about/`, where the header and footer links point.
 * Prerendered to `dist/about/index.html`. Edit freely, or replace with your
 * own story. `WEBSITE_URL` (in branding.ts) is your public site — when set,
 * this page links out to it; leave it empty and the link is not rendered.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const title = t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })

  return (
    <div
      className={cm.cn(cm.container({ size: 'md' }), cm.textCenter, cm.sp('py', 12))}
      data-mol-id="about-page"
    >
      <PageMeta title={title} description={APP_DESCRIPTION} />
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{title}</h1>
      <p className={cm.cn(cm.sp('pt', 4), cm.textMuted)} data-mol-id="about-description">
        {t('about.description', undefined, { defaultValue: APP_DESCRIPTION })}
      </p>
      {WEBSITE_URL ? (
        <p className={cm.sp('pt', 6)}>
          <a className={cm.link} href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
            {t('about.visitWebsite', undefined, { defaultValue: 'Visit our website' })}
          </a>
        </p>
      ) : null}
    </div>
  )
}
