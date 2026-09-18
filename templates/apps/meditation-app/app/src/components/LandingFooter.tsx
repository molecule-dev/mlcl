import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Public marketing footer for Stillpoint's Landing / About / Privacy / Terms
 * pages — brand wordmark + tagline on the left, About / Sign in / Sign up
 * links on the right. Shared so every public surface carries identical chrome.
 */
export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      data-mol-id="landing-footer"
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 12),
        'bg-surface-secondary border-t border-primary-container',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
          'max-w-7xl mx-auto md:flex-row',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
            'md:items-start',
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'text-primary',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              self_improvement
            </span>
            {APP_NAME}
          </Link>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'stillpoint.landing.footer.tagline',
              { tagline: APP_TAGLINE, app: APP_NAME },
              { defaultValue: '© {{app}} — {{tagline}}.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.flex({ gap: 'lg' }), cm.textSize('sm'), 'text-on-surface-variant')}
        >
          <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
          </Link>
          <Link to="/privacy" className={cm.cn('hover:text-primary transition-colors')}>
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </Link>
          <Link to="/terms" className={cm.cn('hover:text-primary transition-colors')}>
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </Link>
          <Link to="/login" className={cm.cn('hover:text-primary transition-colors')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link to="/signup" className={cm.cn('hover:text-primary transition-colors')}>
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
