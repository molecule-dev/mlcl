import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { withBase } from '../site.js'

/** Brand + site navigation + theme toggle. There is no user menu: nobody logs in to a static site. */
export function Header() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AppHeader
      appName={APP_NAME}
      logoSrc={withBase('logo.svg')}
      logoSize={LOGO_SIZE}
      dataMolId="site-header"
      extraActions={
        <nav aria-label={t('nav.label', undefined, { defaultValue: 'Site' })}>
          <Link className={cm.link} to="/about/" data-mol-id="nav-about">
            {t('nav.about', undefined, { defaultValue: 'About' })}
          </Link>
        </nav>
      }
    />
  )
}
