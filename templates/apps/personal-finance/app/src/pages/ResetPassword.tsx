// Phase 1 — derived copy from Login (same stitch: design-personal-finance-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success). The reset link's ?email= seeds it
  // and wins over any stored value; otherwise the email typed on Forgot
  // carries over.
  const urlEmail = searchParams.get('email') ?? undefined
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const token = searchParams.get('token') ?? ''
  const oauthUnavailableLabel = t(
    'resetPassword.oauthUnavailable',
    {},
    { defaultValue: 'Single sign-on is not available yet.' },
  )
  const securityUnavailableLabel = t(
    'resetPassword.securityUnavailable',
    {},
    { defaultValue: 'Security center is not available in this build yet.' },
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setError(
        t(
          'resetPassword.missingToken',
          {},
          {
            defaultValue:
              'Reset link is missing the token. Please request a new password-reset email.',
          },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/reset-password', { token, password })
      clearAuthForm()
      setSuccess(true)
      // Brief pause so the success state is visible before redirect.
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'resetPassword.error',
              {},
              { defaultValue: 'Could not reset password. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        {/* Login Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xl' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl tonal-sculpting',
          )}
        >
          {/* Branding Header */}
          <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                cm.roundedFull,
                'primary-gradient',
              )}
            >
              <span
                className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.textPrimary,
                'font-headline font-extrabold tracking-tighter',
              )}
            >
              {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('resetPassword.appTagline', {}, { defaultValue: 'The Financial Curator' })}
            </p>
          </header>
          {/* Form */}
          <form className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                data-mol-id="reset-password-error"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'rounded-lg bg-error-container text-on-error-container',
                )}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                role="status"
                aria-live="polite"
                data-mol-id="reset-password-success"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'rounded-lg bg-secondary-container text-on-secondary-container',
                )}
              >
                {t(
                  'resetPassword.success',
                  {},
                  { defaultValue: 'Password reset. Redirecting to sign in…' },
                )}
              </div>
            )}
            {/* Email Field */}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
                htmlFor="email"
              >
                {t('resetPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mr', 3),
                    'material-symbols-outlined text-outline',
                  )}
                >
                  mail
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 0),
                    cm.fontWeight('medium'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                  )}
                  id="email"
                  placeholder={t(
                    'resetPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'curator@ledger.com' },
                  )}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {/* Password Field */}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 1))}
              >
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <Link
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-primary hover:text-primary-hover transition-colors',
                  )}
                  to="/login"
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 4),
                  'relative bg-surface-container-low rounded-t-lg py-3.5 input-focus-border',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mr', 3),
                    'material-symbols-outlined text-outline',
                  )}
                >
                  lock
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 0),
                    cm.fontWeight('medium'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
                  )}
                  id="password"
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className={cm.cn(
                    cm.sp('ml', 2),
                    'text-outline hover:text-primary transition-colors',
                  )}
                  type="button"
                  aria-label={
                    showPassword
                      ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  onClick={() => setShowPassword((s) => !s)}
                >
                  <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* Primary Action */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                data-mol-id="reset-password-error"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'bg-error-container text-on-error-container rounded-lg',
                )}
              >
                {error}
              </div>
            )}
            <button
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('py', 4),
                cm.sp('mt', 4),
                cm.roundedFull,
                'primary-gradient text-white font-headline hover:shadow-lg hover:shadow-primary/10 active:scale-95 transition-all',
              )}
              type="submit"
              disabled={loading}
            >
              {loading
                ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
                : t('resetPassword.submit', {}, { defaultValue: 'Reset Password' })}
            </button>
          </form>
          {/* Divider */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('py', 2),
              'relative',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}>
              <div className={cm.cn(cm.w('full'), 'bg-surface-container h-[1px]')}></div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('px', 4),
                'relative bg-surface-container-lowest text-outline uppercase tracking-widest',
              )}
            >
              {t('resetPassword.socialDivider', {}, { defaultValue: 'or continue with' })}
            </span>
          </div>
          {/* Social Logins */}
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <button
              title={oauthUnavailableLabel}
              disabled
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('py', 3),
                cm.sp('px', 6),
                cm.roundedFull,
                'bg-surface-container-high transition-colors group opacity-60 cursor-not-allowed',
              )}
              type="button"
            >
              <OAuthProviderLogo provider="google" size={20} ariaLabel="" />
              <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t('oauth.google', {}, { defaultValue: 'Google' })}
              </span>
            </button>
            <button
              title={oauthUnavailableLabel}
              disabled
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('py', 3),
                cm.sp('px', 6),
                cm.roundedFull,
                'bg-surface-container-high transition-colors group opacity-60 cursor-not-allowed',
              )}
              type="button"
            >
              <OAuthProviderLogo provider="github" size={20} ariaLabel="" />
              <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t('oauth.github', {}, { defaultValue: 'GitHub' })}
              </span>
            </button>
          </div>
        </div>
        {/* Footer Link */}
        <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}{' '}
            <Link
              className={cm.cn(
                cm.textPrimary,
                cm.fontWeight('bold'),
                cm.sp('ml', 1),
                'hover:underline decoration-2 underline-offset-4',
              )}
              to="/signup"
            >
              {t('common.signUp', {}, { defaultValue: 'Sign Up' })}
            </Link>
          </p>
        </footer>
      </main>
      {/* Global Footer from Shared Components (Condensed for Login View) */}
      <div
        className={cm.cn(
          cm.w('full'),
          cm.sp('px', 12),
          cm.sp('py', 8),
          cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'lg' }),
          'fixed bottom-0 md:flex-row',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('lg'),
            'font-black text-primary font-headline tracking-tighter',
          )}
        >
          {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <p
          className={cm.cn(
            cm.fontWeight('semibold'),
            'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-secondary',
          )}
        >
          {t(
            'footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} Financial Atelier. All rights reserved.' },
          )}
        </p>
        <nav className={cm.cn(cm.flex({ gap: 'lg' }))}>
          <LegalModalLinks
            show="both"
            linkClassName={cm.cn(
              cm.fontWeight('semibold'),
              'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-secondary hover:text-success transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <button
            type="button"
            disabled
            title={securityUnavailableLabel}
            className={cm.cn(
              cm.fontWeight('semibold'),
              'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-tertiary transition-colors opacity-60 cursor-not-allowed bg-transparent border-0 p-0',
            )}
          >
            {t('nav.security', {}, { defaultValue: 'Security' })}
          </button>
        </nav>
      </div>
    </div>
  )
}

export default ResetPassword
export { ResetPassword, ResetPassword as ResetPasswordPage }
