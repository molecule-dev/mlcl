import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest hover:text-sky-500 transition-colors',
  )
  const { register } = useAuth()
  const navigate = useNavigate()
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthHint, setOauthHint] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ email, password })
      clearAuthForm()
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.error', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-background selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main
        className={cm.cn(
          cm.w('full'),
          cm.maxW('[440px]'),
          cm.stack(10),
          'animate-in fade-in duration-700',
        )}
      >
        {/* Logo Area */}
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(12),
              cm.h(12),
              cm.sp('mb', 4),
              'rounded-xl bg-login-gradient login-card-shadow',
            )}
          >
            <span
              className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
              data-icon="cloud_done"
            >
              cloud_done
            </span>
          </div>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}} Support' })}
          </h1>
        </div>
        {/* Login Card */}
        <div
          className={cm.cn(
            'bg-surface-container-lowest login-card-shadow rounded-xl overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.sp('p', 8), 'md:p-10', cm.stack(10))}>
            <header className={cm.stack(2)}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[2.25rem] leading-tight tracking-[-0.02em] text-on-surface',
                )}
              >
                {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                {t('signup.subheading', {}, { defaultValue: 'Set up your support dashboard' })}
              </p>
            </header>
            {error && (
              <div
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-error-container text-on-error-container rounded-lg',
                )}
                role="alert"
                data-mol-id="signup-error"
              >
                {error}
              </div>
            )}
            {oauthHint && (
              <div
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-surface-container-high text-on-surface-variant rounded-lg',
                )}
                role="status"
              >
                {oauthHint}
              </div>
            )}
            <form onSubmit={handleSubmit} className={cm.stack(6)}>
              {/* Email Field */}
              <div className={cm.stack(2)}>
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'block text-on-surface-variant tracking-wide uppercase',
                  )}
                  htmlFor="email"
                >
                  {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
                  )}
                  id="email"
                  name="email"
                  placeholder={t(
                    'auth.passwordPlaceholderNameCompany',
                    {},
                    { defaultValue: 'name@company.com' },
                  )}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {/* Password Field */}
              <div className={cm.stack(2)}>
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'block text-on-surface-variant tracking-wide uppercase',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <div className={cm.cn('relative')}>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 4),
                      'py-3.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all',
                    )}
                    id="password"
                    name="password"
                    placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className={cm.cn(
                      'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors',
                    )}
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                    }
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[20px]')}
                      data-icon={showPassword ? 'visibility_off' : 'visibility'}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              {/* Sign In Button */}
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('py', 4),
                  cm.sp('px', 6),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-login-gradient text-white tracking-wide transition-all hover:opacity-95 active:scale-[0.98] login-card-shadow disabled:opacity-60',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </form>
            {/* Divider */}
            <div className={cm.cn('relative')}>
              <div
                aria-hidden="true"
                className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}
              >
                <div
                  className={cm.cn(cm.w('full'), 'border-t border-surface-container-high')}
                ></div>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'center' }),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'relative uppercase tracking-widest',
                )}
              >
                <span className={cm.cn(cm.sp('px', 4), 'bg-surface-container-lowest text-outline')}>
                  {t('signup.orContinueWith', {}, { defaultValue: 'or continue with' })}
                </span>
              </div>
            </div>
            {/* Social Logins */}
            <div className={cm.grid({ cols: 3, gap: 'md' })}>
              <button
                type="button"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  'rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors group',
                )}
                aria-label={t(
                  'signup.continueWithGoogle',
                  {},
                  { defaultValue: 'Continue with Google' },
                )}
                onClick={() =>
                  setOauthHint(
                    t(
                      'demo.actionNotWired',
                      {},
                      { defaultValue: 'Not available in this demo preview.' },
                    ),
                  )
                }
              >
                <span className={cm.cn('group-hover:scale-110 transition-transform')}>
                  <OAuthProviderLogo provider="google" size={22} ariaLabel="" />
                </span>
              </button>
              <button
                type="button"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  'rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors group',
                )}
                aria-label={t(
                  'signup.continueWithGitHub',
                  {},
                  { defaultValue: 'Continue with GitHub' },
                )}
                onClick={() =>
                  setOauthHint(
                    t(
                      'demo.actionNotWired',
                      {},
                      { defaultValue: 'Not available in this demo preview.' },
                    ),
                  )
                }
              >
                <span className={cm.cn('group-hover:scale-110 transition-transform')}>
                  <OAuthProviderLogo provider="github" size={22} ariaLabel="" />
                </span>
              </button>
              <button
                type="button"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  'rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors group',
                )}
                aria-label={t('signup.continueWithSSO', {}, { defaultValue: 'Continue with SSO' })}
                onClick={() =>
                  setOauthHint(
                    t(
                      'demo.actionNotWired',
                      {},
                      { defaultValue: 'Not available in this demo preview.' },
                    ),
                  )
                }
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform',
                  )}
                  data-icon="hub"
                >
                  hub
                </span>
              </button>
            </div>
          </div>
          {/* Card Footer */}
          <div
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 5),
              cm.textCenter,
              'bg-surface-container-low',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}
              <Link
                className={cm.cn(
                  'font-bold text-primary hover:text-primary-container transition-colors ml-1',
                )}
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </div>
        </div>
        {/* Global Footer (Shared Component Guidance) */}
        <footer
          className={cm.cn(
            cm.sp('mt', 12),
            cm.flex({ direction: 'col', align: 'center' }),
            cm.stack(4),
          )}
        >
          <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-2')}>
            <LegalModalLinks
              linkClassName={legalLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
            <Link
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-foreground-tertiary uppercase tracking-widest hover:text-sky-500 transition-colors',
              )}
              to="/settings"
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </Link>
          </div>
          <p className={cm.cn('text-[10px] text-foreground-secondary uppercase tracking-wider')}>
            {t(
              'signup.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} Support' },
            )}
          </p>
        </footer>
      </main>
      {/* Decoration element */}
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w('1/3'),
          cm.h('1/3'),
          'fixed top-0 right-0 -z-10 bg-primary/5 blur-[120px] translate-x-1/2 -translate-y-1/2',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w('1/4'),
          cm.h('1/4'),
          'fixed bottom-0 left-0 -z-10 bg-secondary/5 blur-[100px] -translate-x-1/3 translate-y-1/3',
        )}
      ></div>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
