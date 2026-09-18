import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { OAuthButtons } from '../components/OAuthButtons.js'
import { VivaceAuthShell } from '../components/VivaceAuthShell.js'

const INPUT_STYLE = {
  backgroundColor: 'var(--anim-background)',
  color: 'var(--anim-text)',
  border: '1px solid var(--anim-border)',
}

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
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
    // Read live input values so synthetic-fill flows still produce a
    // valid payload even if React's controlled state hasn't tracked them.
    const form = e.currentTarget as HTMLFormElement
    const live = (sel: string): string =>
      (form.querySelector(sel) as HTMLInputElement | null)?.value ?? ''
    const liveEmail = live('input#email') || email
    const livePassword = live('input#password') || password
    const liveConfirm = live('input#confirm') || confirm
    const liveFirstName = live('input#firstName') || firstName
    const liveLastName = live('input#lastName') || lastName
    if (livePassword !== liveConfirm) {
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
      await register({
        email: liveEmail,
        password: livePassword,
        name: `${liveFirstName} ${liveLastName}`.trim(),
      })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Could not create account' }),
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg focus:outline-none transition-colors',
  )
  const labelClass = cm.cn(cm.textSize('xs'), 'block font-mono uppercase tracking-widest mb-1.5')

  return (
    <VivaceAuthShell
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t('signup.subheading', {}, { defaultValue: 'Join the motion workflow' })}
      footer={
        <>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={'font-medium transition-colors'}
            style={{ color: 'var(--anim-primary)' }}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="signup-form">
        <div className={cm.cn('grid grid-cols-2 gap-3')}>
          <div>
            <label
              htmlFor="firstName"
              className={labelClass}
              style={{ color: 'var(--anim-text-secondary)' }}
            >
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className={labelClass}
              style={{ color: 'var(--anim-text-secondary)' }}
            >
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              style={INPUT_STYLE}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="email"
            className={labelClass}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'animator@vivace.io' })}
            className={inputClass}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className={labelClass}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className={labelClass}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            style={INPUT_STYLE}
          />
        </div>

        {error && (
          <p
            role="alert"
            data-mol-id="signup-error"
            className={cm.cn(cm.textSize('xs'), 'font-mono')}
            style={{ color: 'var(--anim-danger)' }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-mol-id="signup-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
            color: 'var(--color-on-primary)',
          }}
        >
          <span>
            {loading
              ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
              : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>

        <OAuthButtons />
      </form>
    </VivaceAuthShell>
  )
}

export default Signup
