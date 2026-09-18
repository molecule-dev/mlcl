// Phase 1 — derived copy from Login (same stitch: design-lms-login.html).
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
  const { register } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
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
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ name, email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.signupFailed', {}, { defaultValue: 'Signup failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}>
      {/* Shell Suppression: This is a focused signup page, so TopNavBar/SideNav are excluded as per Shell Visibility & Relevance */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'min-h-screen bg-surface',
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            cm.maxW('md'),
            cm.sp('p', 12),
            'bg-surface-container-lowest scholar-shadow rounded-xl relative overflow-hidden',
          )}
        >
          {/* Branding Section */}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 10))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'scholar-gradient rounded-lg shadow-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                school
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-headline text-[1.75rem] text-on-surface tracking-tight',
              )}
            >
              {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
          </div>
          {/* Welcome Text */}
          <div className={cm.sp('mb', 10)}>
            <h2
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('mb', 2),
                'font-headline text-[1.75rem] text-on-surface',
              )}
              id="signup-heading"
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('signup.subtitle', {}, { defaultValue: 'Sign up to start your learning journey' })}
            </p>
          </div>
          {/* Form */}
          {error && (
            <div
              className={cm.cn(
                cm.sp('mb', 4),
                cm.sp('p', 3),
                cm.textCenter,
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
              role="alert"
            >
              {error}
            </div>
          )}
          <form className={cm.stack(6)} aria-labelledby="signup-heading" onSubmit={handleSubmit}>
            {/* Name Field */}
            <div>
              <label
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 2),
                  'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                )}
                htmlFor="name"
              >
                {t('signup.fullNameLabel', {}, { defaultValue: 'FULL NAME' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="name"
                  name="name"
                  placeholder={t(
                    'signup.fullNamePlaceholder',
                    {},
                    { defaultValue: 'Enter your name' },
                  )}
                  required={true}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            {/* Email Field */}
            <div>
              <label
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 2),
                  'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                )}
                htmlFor="email"
              >
                {t('signup.emailLabel', {}, { defaultValue: 'EMAIL' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="email"
                  name="email"
                  placeholder={t(
                    'signup.emailPlaceholder',
                    {},
                    { defaultValue: 'Enter your email' },
                  )}
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {/* Password Field */}
            <div>
              <label
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 2),
                  'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                )}
                htmlFor="password"
              >
                {t('signup.passwordLabel', {}, { defaultValue: 'PASSWORD' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.sp('px', 5),
                    cm.sp('pr', 12),
                    cm.textSize('sm'),
                    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                  )}
                  id="password"
                  name="password"
                  placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                  required={true}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className={cm.cn(
                    'absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors',
                  )}
                  type="button"
                  aria-label={
                    showPassword
                      ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                  }
                  onClick={() => setShowPassword((p) => !p)}
                >
                  <span className={cm.cn('material-symbols-outlined')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            {/* CTA Button */}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.sp('py', 4),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                'scholar-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group',
              )}
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              <span>
                {loading
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('signup.submit', {}, { defaultValue: 'Sign Up' })}
              </span>
              <span
                className={cm.cn(
                  'material-symbols-outlined text-[1.2rem] group-hover:translate-x-1 transition-transform',
                )}
              >
                arrow_forward
              </span>
            </button>
          </form>
          {/* Secondary Action */}
          <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}
              <Link
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  cm.textPrimary,
                  'hover:underline decoration-2 underline-offset-4',
                )}
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </div>
        </div>
      </main>
      {/* Footer Component as defined in JSON (Content/Styles merged) */}
      <footer
        className={cm.cn(
          cm.w('full'),
          cm.sp('py', 8),
          cm.sp('px', 8),
          cm.mxAuto,
          cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 4 }),
          'bg-surface-secondary md:flex-row max-w-screen-2xl',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 6 })}>
          <span className={cm.cn(cm.textSize('sm'), "text-foreground-secondary font-['Inter']")}>
            {t(
              'signup.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} LMS. The Digital Curator.' },
            )}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', gap: 8 })}>
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.textSize('sm'),
              "text-foreground-secondary font-['Inter'] hover:text-foreground dark:hover:text-white transition-all",
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              "text-foreground-secondary font-['Inter'] hover:text-foreground dark:hover:text-white transition-all",
            )}
            to="/help"
          >
            {t('common.contactSupport', {}, { defaultValue: 'Contact Support' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
