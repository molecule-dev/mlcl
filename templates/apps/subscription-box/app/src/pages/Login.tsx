import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
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
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // intentional noop: error is tracked in hook state and displayed via error
    }
  }

  const isLoggingIn = status === 'pending'

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative overflow-hidden',
      )}
    >
      {/* Decorative orbs */}
      <div
        className={cm.cn(
          'absolute -left-32 -top-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-success/20 blur-3xl pointer-events-none',
        )}
      />

      <main className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-[2rem] shadow-xl border border-outline-variant/30',
          )}
        >
          {/* Brand header */}
          <header
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.textCenter,
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-3xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                redeem
              </span>
            </span>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tighter text-on-surface')}>
              {APP_NAME}
            </h1>
            <p className={cm.cn('text-sm font-medium text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          {/* Welcome heading */}
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('login.welcomeBack', {}, { defaultValue: 'Welcome back, curator.' })}
            </h2>
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'login.subtitle',
                {},
                { defaultValue: 'Sign in to peek at next month\u2019s box.' },
              )}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {error && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'rounded-xl bg-error/10 text-error text-sm text-center',
                )}
              >
                {error.message}
              </div>
            )}
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              </span>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 focus-within:border-primary transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-base text-on-surface-variant mr-2',
                  )}
                >
                  mail
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(
                    'auth.passwordPlaceholderEmail',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
                  className={cm.cn(
                    'flex-1 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
                  )}
                />
              </div>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'ml-1')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </span>
                <Link
                  to="/forgot-password"
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-primary hover:underline decoration-2 underline-offset-2',
                  )}
                >
                  {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 focus-within:border-primary transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-base text-on-surface-variant mr-2',
                  )}
                >
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  className={cm.cn(
                    'flex-1 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
                  aria-label={
                    showPassword
                      ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('login.showPassword', {}, { defaultValue: 'Show password' })
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={isLoggingIn}
              className={cm.cn(
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.sp('mt', 2),
                'text-base text-on-primary bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60',
              )}
            >
              {isLoggingIn
                ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </button>
          </form>

          {/* OAuth */}
          <OAuthButtons />
        </div>

        <footer
          className={cm.cn(
            cm.sp('mt', 6),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
          )}
        >
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link
              to="/signup"
              className={cm.cn(
                'text-primary font-bold hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('login.signUp', {}, { defaultValue: 'Start your box →' })}
            </Link>
          </p>
          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
              'text-xs text-on-surface-variant',
            )}
          >
            <LegalModalLinks
              linkClassName={cm.cn('font-semibold hover:text-primary transition-colors')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </footer>
      </main>
    </div>
  )
}

export default Login
