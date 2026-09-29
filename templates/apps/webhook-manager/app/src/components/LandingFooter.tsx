import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Shared public marketing footer (Landing, About, Privacy, Terms).
 * Kept in sync as the single source of the public-surface copyright line.
 *
 * Layout follows the Stitch "Pylon" design: mono brand over link columns
 * (Product / Company / Developers) and a hairline-separated copyright line.
 * Every link resolves to a real route or an honest external target — no
 * dead "#" anchors from the design mock.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const linkClass = 'text-on-surface-variant hover:text-primary transition-colors text-xs'

  return (
    <footer
      data-mol-id="public-footer"
      className={cm.cn('border-t border-outline-variant bg-background py-12')}
      style={{
        borderColor: 'var(--mol-color-border)',
      }}
    >
      <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
        <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-8')}>
          <div className="col-span-2 md:col-span-4 mb-2">
            {/* footer lockup: shared BrandWordmark (footer variant keeps the
                per-page brand-wordmark e2e contract header-scoped) */}
            <BrandWordmark as="span" size="sm" footer />
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-on-surface text-sm mb-2">
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <Link to="/signup" data-mol-id="landing-footer-signup" className={cm.cn(linkClass)}>
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
            </Link>
            <Link to="/login" data-mol-id="landing-footer-login" className={cm.cn(linkClass)}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-on-surface text-sm mb-2">
              {t('landing.footer.company', {}, { defaultValue: 'Company' })}
            </h4>
            <Link to="/about" data-mol-id="landing-footer-about" className={cm.cn(linkClass)}>
              {t('landing.footer.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/privacy" data-mol-id="landing-footer-privacy" className={cm.cn(linkClass)}>
              {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to="/terms" data-mol-id="landing-footer-terms" className={cm.cn(linkClass)}>
              {t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-on-surface text-sm mb-2">
              {t('landing.footer.developers', {}, { defaultValue: 'Developers' })}
            </h4>
            <a
              href="https://github.com/molecule-dev"
              target="_blank"
              rel="noopener noreferrer"
              className={cm.cn(linkClass)}
            >
              {t('landing.footer.github', {}, { defaultValue: 'GitHub' })}
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-on-surface text-sm mb-2">
              {t('landing.footer.system', {}, { defaultValue: 'System' })}
            </h4>
            <a
              href="https://www.molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className={cm.cn(linkClass)}
            >
              {t('landing.footer.builtWith', {}, { defaultValue: 'Built with Molecule.dev' })}
            </a>
          </div>
        </div>
        <div
          className={cm.cn(
            'mt-8 pt-8 border-t border-outline-variant text-xs text-on-surface-variant',
          )}
        >
          <p>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}' },
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
    </footer>
  )
}

export default LandingFooter
