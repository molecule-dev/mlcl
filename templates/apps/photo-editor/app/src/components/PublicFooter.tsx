/**
 * Public footer shared by the Landing, About, Privacy, and Terms pages.
 * Extracted from the Landing page so every unauthenticated surface carries
 * the same Lustra wordmark, link set, and copyright. The "About" link
 * points at the in-app `/about` page (never an external marketing site).
 * Privacy/Terms open IN-PLACE modals (`LegalModalLinks`) with the bonded
 * legal HTML pre-loaded via `loadContent` — the standalone `/privacy` and
 * `/terms` routes still exist for direct/deep links.
 */
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { LustraWordmark } from './LustraWordmark.js'

export function PublicFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="public-footer"
      className={cm.cn(
        cm.sp('py', 10),
        cm.sp('px', 6),
        'border-t border-[var(--photo-border)] bg-[var(--photo-sidebar-bg)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          'max-w-[1100px] mx-auto',
        )}
      >
        <LustraWordmark size="sm" />
        <div
          className={cm.cn(
            cm.flex({ gap: 'lg' }),
            'font-mono text-[10px] uppercase tracking-widest text-[var(--photo-text-muted)]',
          )}
        >
          <Link
            to="/about"
            data-mol-id="footer-about"
            className={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}
          >
            {t('landing.footer.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link to="/login" className={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/signup"
            className={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}
          >
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
          <Link
            to="/presets"
            className={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}
          >
            {t('landing.footer.presets', {}, { defaultValue: 'Presets' })}
          </Link>
          <LegalModalLinks
            linkClassName={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('footer.terms', {}, { defaultValue: 'Terms' })}
          />
        </div>
        <p className={cm.cn('font-mono text-[10px] text-[var(--photo-text-muted)]')}>
          {t(
            'landing.footer.copyright',
            { appName: APP_NAME },
            { defaultValue: '© {{appName}} — Light bends to your will.' },
          )}
        </p>
      </div>
    </footer>
  )
}

export default PublicFooter
