import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const fieldClass = (cm: ReturnType<typeof getClassMap>) =>
  cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    cm.textSize('sm'),
    'rounded-md font-mono transition-colors',
  )

const fieldStyle = {
  backgroundColor: 'var(--mol-color-input-background)',
  border: '1px solid var(--mol-color-border)',
  color: 'var(--mol-color-text)',
} as const

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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatchError, setMismatchError] = useState<string | null>(null)
  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* hook owns error state — caller reads status/error from the hook */
    }
  }

  return (
    <AuthShell
      title={t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
      subtitle={t(
        'signup.subtitle',
        {},
        { defaultValue: 'Wire your first endpoint in five minutes.' },
      )}
      statusLabel="free tier · no card required"
      footer={
        <p>
          {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
          <Link
            to="/login"
            className={cm.cn('font-bold ml-1 hover:underline')}
            style={{ color: BRAND_COLOR }}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="name"
          >
            {t('form.fullName', {}, { defaultValue: 'Full name' })}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Riley Park' })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="signup-name"
          />
        </div>

        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="email"
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="signup-email"
          />
        </div>

        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="password"
          >
            {t('auth.login.password', {}, { defaultValue: 'Password' })}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="signup-password"
          />
        </div>

        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            htmlFor="confirmPassword"
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="signup-confirm-password"
          />
        </div>

        {error || mismatchError ? (
          <div
            data-mol-id="signup-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-md text-center',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
              color: 'var(--mol-color-error)',
            }}
          >
            {mismatchError || error?.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSigningUp}
          className={cm.cn(
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
          )}
          style={{
            backgroundColor: BRAND_COLOR,
            color: 'var(--color-on-primary)',
            boxShadow:
              '0 12px 28px -12px color-mix(in srgb, var(--mol-color-primary) 60%, transparent)',
          }}
          data-mol-id="signup-submit"
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        </button>
      </form>

      <OAuthButtons />
    </AuthShell>
  )
}
