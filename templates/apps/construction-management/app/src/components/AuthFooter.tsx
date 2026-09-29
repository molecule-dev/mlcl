import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

export default function AuthFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    'text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant hover:text-primary transition-colors',
  )
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'center', gap: 'xl' }),
        cm.sp('px', 8),
        cm.sp('py', 6),
        // Static flow (mt-auto pins it below short content) — a fixed footer
        // painted OVER tall auth panels and broke the axe color-contrast gate
        // whenever content extended under it.
        'mt-auto w-full',
      )}
    >
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-[0.15em] text-on-surface-variant',
        )}
      >
        {t(
          'footer.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}}' },
        )}
      </span>
      <div className={cm.cn(cm.flex({ gap: 'lg' }))}>
        <LegalModalLinks
          linkClassName={legalLinkClass}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
        <Link
          className={cm.cn(
            'text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface-variant hover:text-primary transition-colors',
          )}
          to="/about"
        >
          {/* The shared catalog's footer.about value is 'About {{appName}}' —
              without the values object it rendered the placeholder literally. */}
          {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
        </Link>
      </div>
    </footer>
  )
}
export { AuthFooter }
