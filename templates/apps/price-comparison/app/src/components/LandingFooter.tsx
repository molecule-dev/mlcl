import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public marketing-chrome footer shared by the Landing page and the
 * standalone public pages (About, Privacy, Terms). Privacy and Terms open
 * IN-PLACE modals via {@link LegalModalLinks} (same bonded content as the
 * /privacy and /terms routes) rather than navigating away.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const linkClassName = cm.cn('hover:text-primary transition-colors')

  return (
    <footer
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 10),
        'border-t border-outline-variant/40 bg-surface-container-low',
      )}
    >
      <div
        data-mol-id="landing-footer"
        className={cm.cn(
          cm.maxW('xl'),
          cm.mxAuto,
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.textSize('sm'),
          'max-w-screen-2xl text-on-surface-variant',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('extrabold'),
            'tracking-tighter text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-primary')} aria-hidden="true">
            filter_alt
          </span>
          {APP_NAME}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
          <Link to="/about" className={linkClassName}>
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
          </Link>
          <Link to="/pricing" className={linkClassName}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/login" className={linkClassName}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link to="/signup" className={linkClassName}>
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
          <LegalModalLinks
            linkClassName={linkClassName}
            appName={APP_NAME}
            loadContent={loadContent}
          />
        </div>
        <span>
          {t(
            'common.copyrightBuiltWithMolecule',
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
        </span>
      </div>
    </footer>
  )
}

export default LandingFooter
