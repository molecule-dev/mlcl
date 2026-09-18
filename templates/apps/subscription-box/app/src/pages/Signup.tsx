import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
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
  const [localError, setLocalError] = useState<string | null>(null)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError(t('signup.passwordMismatch', {}, { defaultValue: 'Passwords need to match.' }))
      return
    }
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // intentional noop: error is tracked in hook state and displayed via error
    }
  }

  const displayError = localError || error?.message

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface relative overflow-hidden',
      )}
    >
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
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-[2rem] shadow-xl border border-outline-variant/30',
          )}
        >
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

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t(
                'signup.heading',
                { appName: APP_NAME },
                { defaultValue: 'Start your first {{appName}}' },
              )}
            </h2>
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'signup.subtitle',
                {},
                { defaultValue: 'No long forms. Cancel anytime — pause without penalty.' },
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {displayError && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'rounded-xl bg-error/10 text-error text-sm text-center',
                )}
              >
                {displayError}
              </div>
            )}
            <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 sm:grid-cols-2')}>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                  )}
                >
                  {t('form.firstName', {}, { defaultValue: 'First name' })}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                  )}
                >
                  {t('form.lastName', {}, { defaultValue: 'Last name' })}
                </span>
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
                  )}
                />
              </label>
            </div>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
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
                  className={cm.cn(
                    'flex-1 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
                  )}
                  placeholder="you@example.com"
                />
              </div>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
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
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cm.cn(
                    'flex-1 py-3 bg-transparent border-none outline-none text-sm font-medium text-on-surface',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
                  aria-label={
                    showPassword
                      ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                      : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1',
                )}
              >
                {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
                )}
              />
            </label>
            <button
              type="submit"
              disabled={isSigningUp}
              className={cm.cn(
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                cm.sp('mt', 2),
                'text-base text-on-primary bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-60',
              )}
            >
              {isSigningUp
                ? t('signup.submitting', {}, { defaultValue: 'Wrapping it up…' })
                : t('signup.submit', {}, { defaultValue: 'Start your box' })}
            </button>
          </form>

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
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(
                'text-primary font-bold hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
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

export default Signup
