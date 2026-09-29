import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

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

  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) return
    try {
      await signup({
        email,
        password,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // tracked in hook state — useSignup exposes error
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('medium'),
    'rounded-xl bg-bg-secondary border border-border focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    cm.sp('mb', 2),
    'block uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative overflow-hidden bg-bg',
      )}
    >
      <div
        className={cm.cn('absolute inset-0 -z-10')}
        style={{
          background:
            'radial-gradient(circle at 0% 0%, var(--color-primary-light) 0%, transparent 45%), radial-gradient(circle at 100% 100%, var(--color-accent-light) 0%, transparent 50%), var(--color-bg)',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute -top-32 -right-20 rounded-full bg-primary/15 blur-3xl -z-10')}
        style={{ width: 360, height: 360 }}
        aria-hidden="true"
      />
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <Link
              to="/"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('mb', 4),
              )}
              aria-label={APP_NAME}
            >
              <BrandWordmark />
            </Link>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('signup.title', {}, { defaultValue: 'Open your storefront in 60 seconds.' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'signup.subtitle',
                {},
                { defaultValue: 'No credit card. Sell up to $10K before your first fee.' },
              )}
            </p>
          </header>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-3xl bg-surface border border-border shadow-xl shadow-primary/5',
            )}
          >
            <form className={cm.stack(4)} onSubmit={handleSubmit}>
              <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
                <div>
                  <label className={labelClass} htmlFor="first-name">
                    {t('form.firstName', {}, { defaultValue: 'First name' })}
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="last-name">
                    {t('form.lastName', {}, { defaultValue: 'Last name' })}
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="signup-email">
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="signup-password">
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="signup-confirm">
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-error')}>
                    {t('signup.mismatch', {}, { defaultValue: 'Passwords don\u2019t match' })}
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-error-light text-error',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || password !== confirmPassword}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 transition-all',
                )}
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                }}
              >
                {isSubmitting
                  ? t('signup.submitting', {}, { defaultValue: 'Creating your store…' })
                  : t('signup.submit', {}, { defaultValue: 'Create my store' })}
              </button>
            </form>

            <div className={cm.cn(cm.sp('mt', 6))}>
              <OAuthButtons />
            </div>
          </div>

          <p
            className={cm.cn(
              cm.textCenter,
              cm.textSize('sm'),
              cm.sp('mt', 8),
              'text-on-surface-variant',
            )}
          >
            {t(
              'signup.haveAccount',
              { appName: APP_NAME },
              { defaultValue: 'Already on {{appName}}?' },
            )}{' '}
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:text-primary-hover')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Signup
