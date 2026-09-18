import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SigilBrandHeader } from '../components/SigilBrandHeader.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/vault'
  const { status, error, login } = useLogin()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // error surfaced via error from useLogin hook state
    }
  }

  const isLoggingIn = status === 'pending'

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg border border-primary-light/40 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  )

  const legalLinkClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low/40 font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 8),
            'bg-surface rounded-2xl shadow-lg shadow-primary-light/40 border border-primary-light/30',
          )}
        >
          <SigilBrandHeader
            heading={t(
              'auth.login.signInTitle',
              { appName: APP_NAME },
              { defaultValue: 'Welcome back' },
            )}
            subhead={t('login.subhead', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
          />

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('login.password', {}, { defaultValue: 'Master password' })}
                <Link
                  to="/forgot-password"
                  className={cm.cn(
                    'text-primary hover:underline normal-case tracking-normal text-[11px]',
                  )}
                >
                  {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
                </Link>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className={cm.cn(inputClass, 'font-mono tracking-[0.08em]')}
              />
            </label>

            <button
              type="submit"
              disabled={isLoggingIn}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {isLoggingIn ? 'progress_activity' : 'lock_open'}
              </span>
              {isLoggingIn
                ? t('login.unlocking', {}, { defaultValue: 'Unlocking vault...' })
                : t('login.submit', {}, { defaultValue: 'Unlock vault' })}
            </button>
            {error && (
              <p className={cm.cn(cm.textSize('xs'), 'text-error text-center')}>{error.message}</p>
            )}
          </form>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('py', 1),
              'relative',
            )}
          >
            <div className={cm.cn('absolute inset-0', cm.flex({ align: 'center' }))}>
              <span className={cm.cn(cm.w('full'), 'h-px bg-primary-light/50')} />
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'relative bg-surface text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {t('login.orContinue', {}, { defaultValue: 'or continue with' })}
            </span>
          </div>

          <OAuthButtons />
        </div>

        <footer
          className={cm.cn(
            cm.sp('mt', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          <span>
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link to="/signup" className={cm.cn('text-primary-dark font-bold hover:underline')}>
              {t('login.signUp', {}, { defaultValue: 'Create your vault' })}
            </Link>
          </span>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              cm.sp('mt', 3),
            )}
          >
            <LegalModalLinks
              linkClassName={legalLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </nav>
        </footer>
      </main>
    </div>
  )
}

export default Login
