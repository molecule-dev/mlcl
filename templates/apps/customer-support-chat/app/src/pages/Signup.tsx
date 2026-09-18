import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register } = useAuth()
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
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    try {
      await register({ email, password, name: `${firstName} ${lastName}`.trim() })
      clearAuthForm()
      navigate('/inbox')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Account creation failed.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  const fieldShell = cm.cn(
    cm.flex({ align: 'center', gap: 2 }),
    cm.sp('px', 4),
    'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
  )
  const labelText = cm.cn(
    cm.fontWeight('semibold'),
    'text-[10px] uppercase tracking-widest text-on-surface-variant',
  )
  const baseInput = cm.cn(
    cm.flex1,
    cm.sp('p', 0),
    cm.fontWeight('medium'),
    cm.textSize('sm'),
    'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
  )

  return (
    <AuthShell
      heading={t(
        'signup.heading',
        { appName: APP_NAME },
        { defaultValue: 'Create your {{appName}} account' },
      )}
      subheading={t(
        'signup.subheading',
        {},
        { defaultValue: 'Start your free 14-day trial. No credit card required.' },
      )}
      footer={
        <>
          <span>
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}
          </span>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-md bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
            )}
          >
            {error}
          </div>
        )}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span className={labelText}>
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </span>
            <div className={fieldShell}>
              <input
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={baseInput}
                placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Maya' })}
              />
            </div>
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span className={labelText}>
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </span>
            <div className={fieldShell}>
              <input
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={baseInput}
                placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Reyes' })}
              />
            </div>
          </label>
        </div>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span className={labelText}>
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <div className={fieldShell}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={baseInput}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span className={labelText}>
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <div className={fieldShell}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              lock
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={baseInput}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span className={labelText}>
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <div className={fieldShell}>
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
            >
              lock_reset
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={baseInput}
              placeholder={t(
                'auth.signup.repeatYourPassword',
                {},
                { defaultValue: 'Repeat your password' },
              )}
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
        <OAuthButtons />
      </form>
    </AuthShell>
  )
}

export default Signup
export { Signup, Signup as SignupPage }
