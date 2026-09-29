import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

/**
 * Public marketing footer, shared across the Landing page and the
 * standalone public pages (About / Privacy / Terms) so the brand chrome
 * stays consistent. Three-part layout per the Stitch design: brand,
 * uppercase link row, copyright.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn('border-t border-[color:var(--color-border)] bg-surface-container-low')}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          'mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-12 md:flex-row lg:px-8',
        )}
      >
        <BrandWordmark as="span" size="sm" footer />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'flex-wrap justify-center')}>
          <Link
            to="/about"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/privacy"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
            )}
          >
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </Link>
          <Link
            to="/terms"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
            )}
          >
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </Link>
          <Link
            to="/login"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/signup"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
            )}
          >
            {t('landing.footer.startTrial', {}, { defaultValue: 'Start trial' })}
          </Link>
        </div>
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
            className="font-medium hover:underline"
          >
            Molecule.dev
          </a>
        </span>
      </div>
    </footer>
  )
}

export default LandingFooter
