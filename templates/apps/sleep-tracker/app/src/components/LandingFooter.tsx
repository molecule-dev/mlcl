import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Public marketing footer shared by the Landing, About, Privacy, and Terms
 * pages so the brand chrome stays consistent across all public surfaces.
 * Styled after the Stitch landing footer: night-chart canvas, brand column
 * left, policy links right.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        'w-full bg-night-chart border-t border-night-edge',
        cm.sp('py', 12),
        cm.sp('px', 6),
        cm.textSize('sm'),
        'text-night-muted',
      )}
    >
      <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'grid grid-cols-1 md:grid-cols-2 gap-8')}>
        <div>
          {/* footer lockup: shared BrandWordmark (footer variant keeps the
              per-page brand-wordmark e2e contract header-scoped) */}
          <div className={cm.cn('text-on-surface', cm.sp('mb', 4))}>
            <BrandWordmark as="span" size="md" footer />
          </div>
          <p className={cm.cn(cm.maxW('xs'), cm.sp('mb', 6), 'font-light tracking-wide')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. Crafted for restorative rest.' },
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
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'md:items-end justify-start')}
        >
          <Link
            to="/privacy"
            className={cm.cn('font-light tracking-wide hover:text-on-surface transition-colors')}
          >
            {t('landing.privacyLink', {}, { defaultValue: 'Privacy Policy' })}
          </Link>
          <Link
            to="/terms"
            className={cm.cn('font-light tracking-wide hover:text-on-surface transition-colors')}
          >
            {t('landing.termsLink', {}, { defaultValue: 'Terms of Service' })}
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
