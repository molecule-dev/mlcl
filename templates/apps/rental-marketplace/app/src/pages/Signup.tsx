import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { RoostAuthShell } from '../components/RoostAuthShell.js'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await signup({ name: `${firstName} ${lastName}`.trim(), email, password })
      clearAuthForm()
      navigate('/search', { replace: true })
    } catch (_error) {
      // Error is tracked in hook state (error from useSignup); no additional handling needed.
    }
  }

  const isPending = status === 'pending'

  return (
    <RoostAuthShell
      eyebrow={t('signup.eyebrow', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
      heading={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subheading={t(
        'signup.subheading',
        {},
        {
          defaultValue: 'Save listings, message hosts, and book stays in 30 seconds. Free, always.',
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
          <Link to="/login" className={'text-accent-on-surface font-bold hover:underline'}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn('grid grid-cols-2 gap-3')}>
          <FieldWithLabel label={t('form.firstName', {}, { defaultValue: 'First name' })}>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'w-full bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </FieldWithLabel>
          <FieldWithLabel label={t('form.lastName', {}, { defaultValue: 'Last name' })}>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'w-full bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </FieldWithLabel>
        </div>
        <FieldWithLabel label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'w-full bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
            )}
          />
        </FieldWithLabel>
        <FieldWithLabel label={t('auth.login.password', {}, { defaultValue: 'Password' })}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'w-full bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
            )}
          />
        </FieldWithLabel>
        <FieldWithLabel
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
        >
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'w-full bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
            )}
          />
        </FieldWithLabel>

        {mismatch || error ? (
          <p
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/30',
            )}
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDontMatchPeriod',
                  {},
                  { defaultValue: "Passwords don't match." },
                )
              : error?.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {isPending
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </form>

      <OAuthButtons />
    </RoostAuthShell>
  )
}

function FieldWithLabel({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
