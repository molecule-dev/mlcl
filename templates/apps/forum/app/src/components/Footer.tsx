import { AppFooter } from '@molecule/app-footer-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Shared app footer (About / Privacy / Terms / language picker) plus the
 * marketing © line with the required linked "Built with" credit.
 */
export function Footer() {
  const { t } = useTranslation()

  return (
    <>
      <AppFooter appName={APP_NAME} aboutHref="/about" loadContent={loadContent} />
      <div className="bg-surface border-t border-outline-variant/30">
        <div className="max-w-[1120px] mx-auto px-6 py-6 text-center text-sm text-on-surface-variant">
          <p>
            {t(
              'common.copyrightAllRightsReserved',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              Molecule.dev
            </a>
          </p>
        </div>
      </div>
    </>
  )
}

export default Footer
