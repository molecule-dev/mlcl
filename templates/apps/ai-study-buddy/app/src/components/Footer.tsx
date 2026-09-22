import { useState } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * App-shell footer.
 *
 * About/Pricing are internal `<Link>` routes. Privacy/Terms open IN-PLACE
 * modals (`LegalModalLinks`) with the bonded legal HTML pre-loaded via
 * `loadContent`, so they never render empty — the standalone `/privacy`
 * and `/terms` routes still exist for direct/deep links.
 */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [year] = useState(() => new Date().getFullYear())
  // min-h-[40px] inline-flex: footer links are the page's smallest tap
  // targets — keep them reachable at 390px.
  const legalLinkClass = cm.cn(
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'inline-flex min-h-[40px] items-center hover:text-primary transition-colors',
  )
  return (
    <footer
      className={cm.cn(
        cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
        cm.sp('px', 6),
        cm.sp('py', 8),
        'border-t border-outline-variant/15 bg-surface-container-low text-on-surface-variant',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), 'serif-text italic')}>
        {t(
          'footer.copyright',
          { app: APP_NAME, year },
          { defaultValue: '© {{year}} {{app}}. Learn well, sleep well.' },
        )}
      </p>
      <nav className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }))}>
        <Link
          to="/about"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'inline-flex min-h-[40px] items-center hover:text-primary transition-colors',
          )}
        >
          {t('nav.about', {}, { defaultValue: 'About' })}
        </Link>
        <Link
          to="/pricing"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'inline-flex min-h-[40px] items-center hover:text-primary transition-colors',
          )}
        >
          {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
        </Link>
        <LegalModalLinks
          linkClassName={legalLinkClass}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </nav>
    </footer>
  )
}
