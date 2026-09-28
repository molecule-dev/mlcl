import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Public footer for standalone content pages (About, Privacy, Terms).
 * Mirrors the Landing hero footer brand mark + copyright so the public
 * surfaces stay visually consistent, and links to the real About page.
 */
export function PublicFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="public-footer"
      className={'border-t border-outline-variant/40 relative z-10'}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 4 }),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(7),
              cm.h(7),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-primary-container text-on-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
              aria-hidden="true"
            >
              auto_awesome
            </span>
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'font-headline')}>
            {APP_NAME}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{APP_TAGLINE}</span>
        </div>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 5 }), cm.textSize('xs'))}>
          <Link
            to="/about"
            className={'text-on-surface-variant hover:text-on-surface transition-colors'}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/pricing"
            className={'text-on-surface-variant hover:text-on-surface transition-colors'}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <LegalModalLinks
            appName={APP_NAME}
            loadContent={loadContent}
            linkClassName={'text-on-surface-variant hover:text-on-surface transition-colors'}
          />
        </nav>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
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
        </p>
      </div>
    </footer>
  )
}

export default PublicFooter
