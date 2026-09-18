import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageMeta } from '../components/PageMeta.js'

/**
 * Shown for any route the site does not have. It is not prerendered (a static
 * host serves its own 404 page); it renders when the SPA navigates to an
 * unknown path.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))} data-mol-id="not-found-page">
      <PageMeta
        title={t('notFound.title', undefined, { defaultValue: 'Page not found' })}
        description=""
      />
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('notFound.title', undefined, { defaultValue: 'Page not found' })}
      </h1>
      <p className={cm.sp('pt', 6)}>
        <Link className={cm.link} to="/" data-mol-id="not-found-home">
          {t('notFound.home', undefined, { defaultValue: 'Back to the front page' })}
        </Link>
      </p>
    </div>
  )
}
