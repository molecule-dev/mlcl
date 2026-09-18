import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Shared public marketing footer (Landing, About, Privacy, Terms).
 * Kept in sync as the single source of the public-surface copyright line.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="public-footer"
      className={cm.cn('py-8 text-center text-sm border-t')}
      style={{
        borderColor: 'var(--mol-color-border)',
        color: 'var(--mol-color-text-tertiary)',
      }}
    >
      <p>
        {t(
          'landing.copyright',
          { year: new Date().getFullYear(), app: APP_NAME },
          { defaultValue: '© {{year}} {{app}}. Every payload, delivered.' },
        )}
      </p>
    </footer>
  )
}

export default LandingFooter
