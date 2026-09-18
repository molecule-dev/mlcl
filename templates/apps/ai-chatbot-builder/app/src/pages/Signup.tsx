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
  const [error, setError] = useState<string | null>(null)
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
          : t('signup.failed', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        'bg-surface font-body text-on-surface min-h-screen flex flex-col relative overflow-hidden',
      )}
    >
      {/* Background Decorative Orbs (The "Neural Nodes") */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-tertiary-container neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-secondary-container neural-orb',
        )}
      ></div>
      {/* Main Content */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ direction: 'col', align: 'center' }),
            'w-full max-w-[440px] glass-card ambient-glow rounded-lg md:p-10',
          )}
        >
          {/* Logo Section */}
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 8), 'gap-2 group')}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-gradient-to-tr from-primary to-secondary text-white shadow-lg',
              )}
            >
              <span
                className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                data-icon="auto_awesome"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>
            <span
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tight text-primary',
              )}
            >
              {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
          </div>
          {/* Header */}
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 2),
                'font-headline font-extrabold text-on-surface tracking-tight',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </h1>
            <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
              {t('signup.subtitle', {}, { defaultValue: 'Start building your chatbot workspace' })}
            </p>
          </div>
          {/* Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={cm.stack(2)}>
              <label
                htmlFor="signup-email"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'block text-on-surface-variant',
                )}
              >
                {t('common.emailLabel', {}, { defaultValue: 'Email Address' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  id="signup-email"
                  className={cm.cn(
                    cm.input(),
                    cm.sp('px', 4),
                    'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
                  )}
                  placeholder={t(
                    'auth.passwordPlaceholderNameCompany',
                    {},
                    { defaultValue: 'name@company.com' },
                  )}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {/* Password Field */}
            <div className={cm.stack(2)}>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}
              >
                <label
                  htmlFor="signup-password"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
              </div>
              <div className={cm.cn('relative')}>
                <input
                  id="signup-password"
                  className={cm.cn(
                    cm.input(),
                    cm.sp('px', 4),
                    'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
                  )}
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className={cm.cn(
                    cm.button(),
                    'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors',
                  )}
                  type="button"
                  aria-label={
                    showPassword
                      ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('login.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    data-icon={showPassword ? 'visibility_off' : 'visibility'}
                  >
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* CTA Button */}
            {error && (
              <p
                role="alert"
                data-mol-id="signup-error"
                className={cm.cn(
                  cm.textCenter,
                  cm.textSize('xs'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-error-container text-on-error-container',
                )}
              >
                {error}
              </p>
            )}
            <button
              className={cm.cn(
                cm.button(),
                cm.w('full'),
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.sp('mt', 2),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200',
              )}
              type="submit"
              disabled={loading}
            >
              {loading
                ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                : t('signup.submit', {}, { defaultValue: 'Create Account' })}
            </button>
          </form>
          {/* Divider */}
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('my', 8), 'w-full gap-4')}>
            <div className={cm.cn(cm.flex1, 'h-[1px] bg-surface-container-highest')}></div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-outline uppercase tracking-widest',
              )}
            >
              {t('signup.orContinueWith', {}, { defaultValue: 'or continue with' })}
            </span>
            <div className={cm.cn(cm.flex1, 'h-[1px] bg-surface-container-highest')}></div>
          </div>
          {/* Social Logins */}
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'w-full')}>
            <button
              type="button"
              aria-label={t(
                'signup.continueWithGoogle',
                {},
                { defaultValue: 'Continue with Google' },
              )}
              className={cm.cn(
                cm.button(),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'gap-2 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container-high transition-colors group',
              )}
              onClick={() =>
                setOauthMessage(
                  t(
                    'signup.oauthUnavailable',
                    {},
                    {
                      defaultValue:
                        'Social sign-in is not enabled yet. Please use email and password.',
                    },
                  ),
                )
              }
            >
              <svg
                className={cm.cn(cm.w(5), cm.h(5))}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant group-hover:text-on-surface',
                )}
              >
                {t('oauth.google', {}, { defaultValue: 'Google' })}
              </span>
            </button>
            <button
              type="button"
              aria-label={t(
                'signup.continueWithGitHub',
                {},
                { defaultValue: 'Continue with GitHub' },
              )}
              className={cm.cn(
                cm.button(),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'gap-2 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container-high transition-colors group',
              )}
              onClick={() =>
                setOauthMessage(
                  t(
                    'signup.oauthUnavailable',
                    {},
                    {
                      defaultValue:
                        'Social sign-in is not enabled yet. Please use email and password.',
                    },
                  ),
                )
              }
            >
              <OAuthProviderLogo provider="github" size={20} ariaLabel="" />
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant group-hover:text-on-surface',
                )}
              >
                {t('oauth.github', {}, { defaultValue: 'GitHub' })}
              </span>
            </button>
          </div>
          {oauthMessage && (
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('xs'),
                cm.textCenter,
                'text-on-surface-variant',
              )}
              data-mol-id="signup-oauth-message"
            >
              {oauthMessage}
            </p>
          )}
          {/* Footer Link */}
          <p
            className={cm.cn(
              cm.sp('mt', 10),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}

            <Link
              className={cm.cn('text-primary font-bold hover:underline underline-offset-4 ml-1')}
              to="/login"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </div>
      </main>
      {/* Shared Component Footer */}
      <footer className={cm.cn('relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.sp('py', 8),
            cm.mxAuto,
            'max-w-7xl',
            'md:flex-row w-full gap-4',
          )}
        >
          <div
            className={cm.cn(cm.textSize('sm'), 'text-cyan-700 dark:text-cyan-400 tracking-normal')}
          >
            {t(
              'signup.copyright',
              { year: 2024, appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} AI. Built for the cognitive atmosphere.' },
            )}
          </div>
          <div className={cm.cn(cm.flex(), 'gap-6')}>
            <LegalModalLinks
              linkClassName={cm.cn(
                "text-foreground-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-['Inter'] text-sm",
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
            <Link
              className={cm.cn(
                "text-foreground-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-['Inter'] text-sm",
              )}
              to="/help"
            >
              {t('common.helpCenter', {}, { defaultValue: 'Help Center' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
