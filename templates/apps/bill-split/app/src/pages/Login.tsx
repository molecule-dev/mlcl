import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

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

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state — ignoring here is correct
    }
  }

  return (
    <div
      data-mol-id="page-login"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface rounded-3xl shadow-xl shadow-primary/5 border border-outline-variant/40',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.textCenter}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'mx-auto w-fit rounded-full bg-surface-container-low text-primary border border-outline-variant/30',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  lock
                </span>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                  {t('login.secureAccess', {}, { defaultValue: 'Secure Account Access' })}
                </span>
              </span>
              <h1 className={cm.cn(cm.textSize('xl'), cm.sp('mt', 3), cm.fontWeight('bold'))}>
                {t('login.welcomeBack', {}, { defaultValue: 'Welcome back' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'login.welcomeSub',
                  {},
                  {
                    defaultValue:
                      'Enter your details to manage your circles, track shared expenses, and settle up.',
                  },
                )}
              </p>
            </div>

            <form
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              onSubmit={handleSubmit}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="email"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'relative bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                    )}
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t(
                      'auth.passwordPlaceholderNameCompany',
                      {},
                      { defaultValue: 'name@company.com' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <label
                    htmlFor="password"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.login.password', {}, { defaultValue: 'Password' })}
                  </label>
                  <Link
                    to="/forgot-password"
                    className={cm.cn('text-xs font-bold hover:underline')}
                    style={{ color: 'var(--color-primary-hover)' }}
                  >
                    {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'relative bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                    )}
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('login.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn(
                      'text-on-surface-variant hover:text-primary transition-colors ml-2',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  data-mol-id="login-error"
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-xl bg-error-container text-on-error-container',
                  )}
                >
                  {error.message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-full text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                }}
              >
                {isLoggingIn
                  ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                  : t(
                      'login.submit',
                      { appName: APP_NAME },
                      { defaultValue: 'Sign in to {{appName}}' },
                    )}
                {isLoggingIn ? null : (
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    arrow_forward
                  </span>
                )}
              </button>
            </form>

            <OAuthButtons />

            {/* Stitch trust strip — a real member's circle + the three pillars. */}
            <div
              data-mol-id="login-trust-strip"
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-low border border-outline-variant/30',
                cm.stack(3),
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 3 })}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold',
                  )}
                  aria-hidden="true"
                >
                  CK
                </span>
                <div className={cm.flex1}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {t('login.trustName', {}, { defaultValue: 'Clara K.' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('login.trustRole', {}, { defaultValue: 'Flatmates of 4 in Brooklyn' })}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 0.5),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full bg-primary-container/60 text-on-primary-container',
                  )}
                >
                  {t('login.trustVerified', {}, { defaultValue: 'Verified User' })}
                </span>
              </div>
              <ul className={cm.stack(1.5)}>
                {(
                  [
                    { icon: 'sync_alt', label: 'Zero-math debt minimizer' },
                    { icon: 'contactless', label: 'Instant Venmo & Cash App links' },
                    { icon: 'public', label: 'Multi-currency offline mode' },
                  ] as const
                ).map((row) => (
                  <li key={row.label} className={cm.flex({ align: 'center', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                      aria-hidden="true"
                    >
                      {row.icon}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                      {t(`login.trust.${row.label}`, {}, { defaultValue: row.label })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('login.noAccount', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}{' '}
              <Link
                to="/signup"
                className={cm.cn('font-bold hover:underline ml-1')}
                style={{ color: 'var(--color-primary-hover)' }}
              >
                {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
