// Phase 1 — derived copy from Login (same stitch: design-property-listing-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LoginBrandHeader from '../components/LoginBrandHeader.js'
import LoginFooter from '../components/LoginFooter.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

function Signup() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const cm = getClassMap()

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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      await register({ name: `${firstName} ${lastName}`.trim(), email, password })
      clearAuthForm()
      navigate('/admin/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'signup.registrationError',
              {},
              { defaultValue: 'Could not create account. Please try again.' },
            ),
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
        'bg-background font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('lg'))}>
        {/* Auth Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
            cm.w('full'),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl md:p-14 luxury-shadow',
          )}
        >
          <LoginBrandHeader />
          {/* Header */}
          <div className={cm.cn(cm.textCenter)}>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'font-headline tracking-tight text-on-surface',
              )}
            >
              {t('signup.title', {}, { defaultValue: 'Create Account' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'signup.subtitle',
                {},
                { defaultValue: 'Enter your details to start your estate journey.' },
              )}
            </p>
          </div>
          {/* Signup Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div
                data-mol-id="signup-error"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  cm.textCenter,
                  'rounded-xl bg-error-container text-on-error-container',
                )}
                role="alert"
              >
                {error}
              </div>
            )}
            {/* First Name & Last Name */}
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <div className={cm.stack(2)}>
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 4),
                    'block font-label text-on-surface-variant',
                  )}
                >
                  {t('signup.firstName', {}, { defaultValue: 'First Name' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'ghost-border bg-surface-container-low rounded-xl transition-all',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-outline')}
                    data-icon="person"
                  >
                    person
                  </span>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                    )}
                    placeholder={t('signup.firstNameExample', {}, { defaultValue: 'John' })}
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={cm.stack(2)}>
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 4),
                    'block font-label text-on-surface-variant',
                  )}
                >
                  {t('signup.lastName', {}, { defaultValue: 'Last Name' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'ghost-border bg-surface-container-low rounded-xl transition-all',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-outline')}
                    data-icon="badge"
                  >
                    badge
                  </span>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                    )}
                    placeholder={t('signup.lastNameExample', {}, { defaultValue: 'Doe' })}
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 4),
                  'block font-label text-on-surface-variant',
                )}
              >
                {t('signup.email', {}, { defaultValue: 'Email Address' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'ghost-border bg-surface-container-low rounded-xl transition-all',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-outline')}
                  data-icon="alternate_email"
                >
                  alternate_email
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                  )}
                  placeholder={t('signup.emailExample', {}, { defaultValue: 'name@luxury.com' })}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className={cm.stack(2)}>
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('px', 4))}
              >
                <label
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'block font-label text-on-surface-variant',
                  )}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <Link
                  className={cm.cn('text-secondary font-semibold text-sm hover:underline')}
                  to="/forgot-password"
                >
                  {t('signup.forgotPassword', {}, { defaultValue: 'Forgot Password?' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'ghost-border bg-surface-container-low rounded-xl transition-all',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-outline')} data-icon="lock">
                  lock
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                  )}
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {/* Confirm Password */}
            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 4),
                  'block font-label text-on-surface-variant',
                )}
              >
                {t('signup.confirmPassword', {}, { defaultValue: 'Confirm Password' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'ghost-border bg-surface-container-low rounded-xl transition-all',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-outline')} data-icon="lock">
                  lock
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                  )}
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              disabled={loading}
              className={cm.cn(
                cm.w('full'),
                cm.h(16),
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              type="submit"
            >
              {loading
                ? t('signup.submitLoading', {}, { defaultValue: 'Creating Account...' })
                : t('signup.submitButton', {}, { defaultValue: 'Create Account' })}
              <span className={cm.cn('material-symbols-outlined')} data-icon="arrow_forward">
                arrow_forward
              </span>
            </button>
          </form>
          <OAuthButtons />
          {/* Footer Link */}
          <div className={cm.cn(cm.textCenter)}>
            <p className={cm.cn('text-on-surface-variant')}>
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}

              <Link className={cm.cn('text-primary font-bold ml-1 hover:underline')} to="/login">
                {t('common.signIn', {}, { defaultValue: 'Sign In' })}
              </Link>
            </p>
          </div>
          {/* Legal consent — Terms/Privacy open in-place modals (no navigation). */}
          <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
            <button
              type="button"
              onClick={openTerms}
              className={cm.cn('font-semibold text-primary hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              className={cm.cn('font-semibold text-primary hover:underline')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </button>
          </p>
        </div>
        <LoginFooter />
      </main>
      {/* Background Decoration */}
      <div className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}>
        <div
          className={cm.cn(
            cm.roundedFull,
            'absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px]',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.roundedFull,
            'absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px]',
          )}
        ></div>
      </div>
      {/* Mandatory Footer component from JSON structure (Suppressing for focused Login flow as per rules) */}
      {/* The "Relevance Check" logic hides the global footer for transactional login screens to prioritize focus. */}
      {modals}
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
