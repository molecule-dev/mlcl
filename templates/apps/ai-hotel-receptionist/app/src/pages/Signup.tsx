import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { SwitchboardAuthShell } from '../components/SwitchboardAuthShell.js'

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
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    const fullName = `${firstName} ${lastName}`.trim()
    try {
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* Error tracked in hook state */
    }
  }

  return (
    <SwitchboardAuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: 'Set up your front desk' })}
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t(
        'signup.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            'Spin up {{appName}} for your property: the multilingual voice line, the room board, and reservations in one workspace.',
        },
      )}
      footer={
        <>
          <span className="text-on-surface-variant">
            {t(
              'auth.login.alreadyHaveAccount',
              {},
              { defaultValue: 'Already have an account?' },
            )}{' '}
          </span>
          <Link
            to="/login"
            className={'-my-2 inline-block py-2 text-primary font-bold hover:underline'}
            data-mol-id="signup-login-link"
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        aria-label={t('signup.formLabel', {}, { defaultValue: 'Create account form' })}
      >
        <div className={cm.cn('grid grid-cols-2 gap-3')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.firstName', {}, { defaultValue: 'First name' })}
            </span>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              data-mol-id="signup-first-name"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.lastName', {}, { defaultValue: 'Last name' })}
            </span>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              data-mol-id="signup-last-name"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
              )}
            />
          </label>
        </div>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            data-mol-id="signup-email"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </span>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            data-mol-id="signup-password"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.resetPassword.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            id="confirmPassword"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            data-mol-id="signup-confirm-password"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
            )}
          />
        </label>

        {mismatch ? (
          <p
            data-mol-id="signup-mismatch"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {t('auth.signup.passwordMismatch', {}, { defaultValue: 'Passwords do not match' })}
          </p>
        ) : null}

        {error ? (
          <p
            data-mol-id="signup-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {error.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSigningUp}
          data-mol-id="signup-submit"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isSigningUp
            ? t('common.signingUpEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <OAuthButtons />
    </SwitchboardAuthShell>
  )
}
