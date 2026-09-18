import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing footer shared by the Landing, About, Privacy, and Terms
 * pages so the brand chrome stays consistent across all public surfaces.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        cm.sp('py', 12),
        cm.textCenter,
        cm.textSize('sm'),
        'bg-surface border-t border-outline-variant text-on-surface-variant',
      )}
    >
      <p>
        {t(
          'common.copyrightBuiltWithMolecule',
          { year: new Date().getFullYear(), app: APP_NAME },
          { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
        )}
      </p>
    </footer>
  )
}

export default LandingFooter
