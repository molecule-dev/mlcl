import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/** Site footer: the About link and a copyright line. */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  return (
    <footer className={cm.footerBar} data-mol-id="site-footer">
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), cm.textSize('sm'))}
      >
        <span className={cm.textMuted}>
          {t('footer.copyright', { year, appName: APP_NAME }, { defaultValue: '© {{year}} {{appName}}' })}
        </span>
        <Link className={cm.link} to="/about/" data-mol-id="footer-about">
          {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </Link>
      </div>
    </footer>
  )
}
