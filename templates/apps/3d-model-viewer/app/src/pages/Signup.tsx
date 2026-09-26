// Phase 1 — derived copy from Login (same stitch: design-3d-model-viewer-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const inputCls = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )
  const passwordInputCls = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    cm.sp('pr', 10),
    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(
        t(
          'auth.signup.passwordsDoNotMatchNoPeriod',
          {},
          { defaultValue: 'Passwords do not match' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      const name = [firstName, lastName].filter(Boolean).join(' ')
      await register({ email, password, ...(name ? { name } : {}) })
      clearAuthForm()
      navigate('/dashboard')
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
        cm.flex({ direction: 'col' }),
        cm.w('full'),
        cm.minH('screen'),
        'bg-mesh-gradient font-body text-on-surface antialiased overflow-hidden',
      )}
    >
      {/* Top Navigation Suppressed: Transactional Screen (Signup) */}
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.w('full'),
            cm.sp('p', 10),
            'glass-card max-w-[440px] rounded-[12px]',
          )}
        >
          {/* Header */}
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8), cm.w('full'))}>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.textPrimary,
                cm.sp('mb', 2),
                'font-headline font-black tracking-tighter',
              )}
            >
              {t('signup.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
              {t('signup.tagline', {}, { defaultValue: 'Create your studio account' })}
            </p>
          </div>
          {/* Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
            {/* Name Row */}
            <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }))}>
              <div className={cm.stack(1)}>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                  )}
                  htmlFor="firstName"
                >
                  {t('signup.firstName', {}, { defaultValue: 'First Name' })}
                </label>
                <input
                  autoComplete="given-name"
                  className={inputCls}
                  id="firstName"
                  name="firstName"
                  required={true}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={cm.stack(1)}>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                  )}
                  htmlFor="lastName"
                >
                  {t('signup.lastName', {}, { defaultValue: 'Last Name' })}
                </label>
                <input
                  autoComplete="family-name"
                  className={inputCls}
                  id="lastName"
                  name="lastName"
                  required={true}
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            {/* Email */}
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                )}
                htmlFor="email"
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <div className="relative">
                <input
                  autoComplete="email"
                  className={inputCls}
                  id="email"
                  name="email"
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {/* Password */}
            <div className={cm.stack(1)}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <label
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
              </div>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={passwordInputCls}
                  id="password"
                  name="password"
                  required={true}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('pl', 3),
                    cm.sp('pr', 3),
                    'absolute inset-y-0 right-0 text-outline hover:text-on-surface transition-colors',
                  )}
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* Confirm Password */}
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                )}
                htmlFor="confirmPassword"
              >
                {t('signup.confirmPassword', {}, { defaultValue: 'Confirm Password' })}
              </label>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={inputCls}
                  id="confirmPassword"
                  name="confirmPassword"
                  required={true}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {/* Submit Button */}
            {error && (
              <p
                role="alert"
                className={cm.cn(cm.textCenter, cm.textSize('xs'), cm.sp('mb', 2), 'text-error')}
              >
                {error}
              </p>
            )}
            <div className={cm.sp('pt', 2)}>
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.flex({ justify: 'center' }),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'btn-gradient rounded-[12px] text-on-primary shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 hover:shadow-[0_8px_32px_rgba(26,26,46,0.12)] active:scale-[0.98]',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('signup.createAccount', {}, { defaultValue: 'Create Account' })}
              </button>
            </div>
          </form>
          {/* Footer Link */}
          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              className={cm.cn(
                'font-semibold text-primary hover:text-primary-container transition-colors',
              )}
              to="/login"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </div>
      </main>
      {/* Footer Component */}
      <footer
        className={cm.cn(
          cm.w('full'),
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          cm.fontWeight('medium'),
          "fixed bottom-0 opacity-60 bg-transparent text-primary font-['Inter'] text-[11px] uppercase tracking-[0.05em] z-10 pointer-events-none",
        )}
      >
        <div>
          {t(
            'signup.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} Visualization. Precision Crafted.' },
          )}
        </div>
        <div className={cm.cn(cm.flex({ gap: 6 }), 'pointer-events-auto')}>
          <LegalModalLinks
            linkClassName={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
        </div>
      </footer>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
