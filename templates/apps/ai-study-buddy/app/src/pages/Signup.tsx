import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
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
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'

  const signupNamePrompt = t(
    'signup.fullNamePrompt',
    {},
    { defaultValue: 'How should we address you?' },
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* error tracked in hook state */
    }
  }

  return (
    <AuthShell dataMolId="page-signup">
      <AuthBrandHeader />

      <div
        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), cm.sp('mt', 2))}
      >
        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-center text-on-surface')}
        >
          {t('signup.heading', {}, { defaultValue: 'Begin your study journey' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'serif-text italic text-center text-on-surface-variant',
          )}
        >
          {t('signup.subheading', {}, { defaultValue: 'Free forever — no credit card required.' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {/* Name */}
        <Field
          id="name"
          dataMolId="signup-name"
          icon="person"
          label={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
          placeholder={signupNamePrompt}
          value={name}
          onChange={setName}
          autoComplete="name"
        />

        {/* Email */}
        <Field
          id="email"
          dataMolId="signup-email"
          icon="mail"
          type="email"
          required
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />

        {/* Password */}
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              data-mol-id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
              )}
            />
            <button
              type="button"
              data-mol-id="signup-toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('signup.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <div
            data-mol-id="signup-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error.message}
          </div>
        ) : null}

        <button
          type="submit"
          data-mol-id="signup-submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-60 transition-opacity active:scale-95',
          )}
        >
          {isSigningUp
            ? t(
                'common.creatingYourAccountEllipsis',
                {},
                { defaultValue: 'Creating your account…' },
              )
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          {isSigningUp ? null : (
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              arrow_forward
            </span>
          )}
        </button>
      </form>

      <OAuthButtons />

      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.textCenter,
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
        <Link
          to="/login"
          data-mol-id="signup-login-link"
          className={'font-bold text-primary hover:underline'}
        >
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
      </p>
    </AuthShell>
  )
}

interface FieldProps {
  id: string
  dataMolId?: string
  icon: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}

function Field({
  id,
  dataMolId,
  icon,
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
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
          'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
        )}
      >
        <span
          className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          data-mol-id={dataMolId}
          type={type}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('medium'),
            'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
          )}
        />
      </div>
    </div>
  )
}
