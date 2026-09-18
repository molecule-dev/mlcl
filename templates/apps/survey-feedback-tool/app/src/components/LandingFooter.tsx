import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Public marketing footer, shared across the Landing page and the
 * standalone public pages (About / Privacy / Terms) so the brand chrome
 * stays consistent.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.textSize('xs'),
        'text-on-surface-variant flex-wrap gap-3 border-t border-[color:var(--color-border)]',
      )}
    >
      <span>
        {t(
          'landing.footer.copyright',
          { year: new Date().getFullYear(), app: APP_NAME },
          { defaultValue: '© {{year}} {{app}}. All voices welcome.' },
        )}
      </span>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
          {t('nav.about', {}, { defaultValue: 'About' })}
        </Link>
        <Link to="/login" className={cm.cn('hover:text-primary transition-colors')}>
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
        <Link to="/signup" className={cm.cn('hover:text-primary transition-colors')}>
          {t('landing.footer.startTrial', {}, { defaultValue: 'Start trial' })}
        </Link>
      </div>
    </footer>
  )
}

export default LandingFooter
