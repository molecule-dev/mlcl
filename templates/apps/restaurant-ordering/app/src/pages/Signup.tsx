import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
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
  const restaurant = authFormFields.restaurant ?? ''
  const setRestaurant = (value: string): void => setAuthFormField('restaurant', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const isPending = status === 'pending'

  const mismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    try {
      await signup({
        email,
        password,
        name: [firstName, lastName].filter(Boolean).join(' ').trim() || undefined,
      })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in error from useSignup hook state
    }
  }

  return (
    <AuthShell
      footer={
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t('signup.haveAccount', {}, { defaultValue: 'Already on the line?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              'font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <h2
        className={cm.cn(
          cm.textSize('2xl'),
          cm.textCenter,
          'font-extrabold tracking-tight font-display',
        )}
      >
        {t('signup.heading', {}, { defaultValue: 'Open your kitchen' })}
      </h2>
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
          <CompactField
            id="first-name"
            autoComplete="given-name"
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            value={firstName}
            onChange={setFirstName}
            icon="person"
          />
          <CompactField
            id="last-name"
            autoComplete="family-name"
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            value={lastName}
            onChange={setLastName}
            icon="badge"
          />
        </div>
        <CompactField
          id="restaurant"
          autoComplete="organization"
          label={t('signup.restaurant', {}, { defaultValue: 'Restaurant name' })}
          value={restaurant}
          onChange={setRestaurant}
          icon="restaurant"
        />
        <CompactField
          id="email"
          type="email"
          autoComplete="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          value={email}
          onChange={setEmail}
          icon="mail"
        />
        <CompactField
          id="password"
          type="password"
          autoComplete="new-password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          value={password}
          onChange={setPassword}
          icon="lock"
        />
        <CompactField
          id="confirm"
          type="password"
          autoComplete="new-password"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          value={confirm}
          onChange={setConfirm}
          icon="lock_reset"
        />

        {mismatch && (
          <p className={cm.cn(cm.textSize('xs'), 'text-error font-medium')}>
            {t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )}
          </p>
        )}
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || mismatch}
          className={cm.cn(
            cm.sp('py', 4),
            cm.roundedFull,
            cm.textSize('lg'),
            cm.sp('mt', 2),
            cm.fontWeight('bold'),
            'text-on-primary bg-gradient-to-br from-primary to-tertiary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-60',
          )}
        >
          {isPending
            ? t('signup.submitting', {}, { defaultValue: 'Setting things up…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>
      <OAuthButtons />
    </AuthShell>
  )
}

interface CompactFieldProps {
  id: string
  label: string
  icon: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}

function CompactField({
  id,
  label,
  icon,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: CompactFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'relative bg-surface-container-low rounded-t-lg py-3 border-b-2 border-transparent focus-within:border-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
        />
      </div>
    </div>
  )
}
