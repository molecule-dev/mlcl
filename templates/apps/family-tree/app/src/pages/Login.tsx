import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthAside } from '../components/AuthAside.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, #14b8a6)`

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/tree'
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
      // error is captured in hook state (status/error fields) — no further handling needed
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface relative',
      )}
    >
      {/* §13.4(a) Corner orbs — soft brand wash */}
      <div
        className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute top-[-10%] right-[-10%] bg-primary/10 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute bottom-[-10%] left-[-10%] bg-secondary/10 blur-[120px]',
          )}
        />
      </div>

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        {/* Design layout: marketing aside beside the form card on lg+ */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w('full'),
            cm.maxW('6xl'),
          )}
        >
          <AuthAside variant="login" />
          <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xl' }),
                cm.sp('p', 10),
                'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
              )}
            >
              <AuthBrandHeader />

              <div>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    cm.textCenter,
                    cm.sp('mb', 1),
                  )}
                >
                  {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
                  {t('login.subtitle', {}, { defaultValue: 'Sign in to grow your family tree.' })}
                </p>
              </div>

              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
                <div>
                  <label
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('mb', 2),
                      'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em]',
                    )}
                    htmlFor="email"
                  >
                    {t('login.emailLabel', {}, { defaultValue: 'EMAIL' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 5),
                      cm.textSize('sm'),
                      'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                    )}
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t(
                      'login.emailPlaceholder',
                      {},
                      { defaultValue: 'you@example.com' },
                    )}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('mb', 2),
                    )}
                  >
                    <label
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em]',
                      )}
                      htmlFor="password"
                    >
                      {t('login.passwordLabel', {}, { defaultValue: 'PASSWORD' })}
                    </label>
                    <Link
                      to="/forgot-password"
                      className={cm.cn('text-xs font-bold hover:opacity-80 transition-opacity')}
                      style={{ color: BRAND_COLOR }}
                    >
                      {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                    </Link>
                  </div>
                  <div className={cm.cn('relative')}>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('py', 4),
                        cm.sp('px', 5),
                        cm.textSize('sm'),
                        'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all pr-12',
                      )}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                        'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors',
                      )}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    data-mol-id="login-error"
                    role="alert"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'bg-error-container text-on-error-container rounded-xl',
                    )}
                  >
                    {error.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.sp('mt', 2),
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                  )}
                  style={{ background: submitGradient }}
                >
                  {isLoggingIn
                    ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
                    : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </button>
              </form>

              <OAuthButtons />
            </div>

            <footer
              className={cm.cn(
                cm.sp('mt', 12),
                cm.flex({ direction: 'col', align: 'center' }),
                'gap-4',
              )}
            >
              <div
                className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-2')}
              >
                <span
                  className={cm.cn(
                    'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest',
                  )}
                >
                  {t(
                    'loginFooter.trust',
                    {},
                    { defaultValue: 'Your family history, kept private' },
                  )}
                </span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
                <Link
                  to="/signup"
                  className={cm.cn(
                    'font-bold hover:underline decoration-2 underline-offset-4 ml-1',
                  )}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('login.signUp', {}, { defaultValue: 'Create one' })}
                </Link>
              </p>
            </footer>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
