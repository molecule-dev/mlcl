import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Shared public-page footer, mirroring the Landing copyright strip so the
 * About / Privacy / Terms pages share the Landing chrome.
 */
export function PublicPageFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      data-mol-id="public-page-footer"
      className={cm.cn(
        cm.sp('py', 8),
        cm.textCenter,
        cm.textSize('sm'),
        'bg-surface text-foreground-secondary border-t border-border/60',
      )}
    >
      <p>
        {t(
          'landing.copyright',
          { year: new Date().getFullYear(), app: APP_NAME },
          { defaultValue: '© {{year}} {{app}}. Every second, accounted for.' },
        )}
      </p>
    </footer>
  )
}

export default PublicPageFooter
