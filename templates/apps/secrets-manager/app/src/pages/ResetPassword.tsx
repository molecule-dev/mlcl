import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  const urlEmail = searchParams.get('email') ?? undefined
  // Cross-view auth form persistence — the reset link's ?email= seeds it and
  // wins; the email also carries from the Forgot/Login views. Cleared on success.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const isSubmitting = confirmStatus === 'pending'
  const mismatch = confirm.length > 0 && password !== confirm
  const tooShort = password.length > 0 && password.length < 12

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (mismatch || tooShort) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/vaults', { replace: true })
    } catch (_error) {
      /* error rendered below via resetError/loginError hook state */
    }
  }

  return (
    <AuthShell
      heading={t('resetPassword.heading', {}, { defaultValue: 'Set new credentials' })}
      tagline={t(
        'resetPassword.tagline',
        {},
        { defaultValue: 'Choose a strong password — minimum 12 characters.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            'font-headline font-medium text-text underline decoration-border underline-offset-4 transition-colors hover:text-primary',
          )}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form className={cm.cn('flex flex-col gap-5')} onSubmit={handleSubmit}>
        <Field
          id="reset-email"
          icon="mail"
          label={t('resetPassword.email', {}, { defaultValue: 'Account email' })}
          placeholder="you@arcanum.dev"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <Field
          id="reset-token"
          icon="vpn_key"
          label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          placeholder="••••-••••-••••"
          type="text"
          value={token}
          onChange={setToken}
        />
        <Field
          id="reset-password"
          icon="lock"
          label={t('resetPassword.newPassword', {}, { defaultValue: 'New master password' })}
          placeholder="•••••••••••• (min 12 characters)"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <Field
          id="reset-confirm"
          icon="lock"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          placeholder="••••••••••••"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />

        {(mismatch || tooShort) && (
          <div
            role="alert"
            className={cm.cn(
              'rounded border border-warning/30 bg-warning/10 px-3 py-2 font-mono text-xs text-warning',
            )}
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDoNotMatchPeriod',
                  {},
                  { defaultValue: 'Passwords do not match.' },
                )
              : t(
                  'resetPassword.tooShort',
                  {},
                  { defaultValue: 'Password must be at least 12 characters.' },
                )}
          </div>
        )}

        {confirmError && (
          <div
            role="alert"
            data-mol-id="reset-error"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error',
            )}
          >
            {confirmError.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || mismatch || tooShort}
          className={cm.cn(
            'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
            'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
            'disabled:opacity-60',
          )}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}

interface FieldProps {
  id: string
  icon: string
  label: string
  placeholder: string
  type: string
  autoComplete?: string
  value: string
  onChange: (v: string) => void
}

function Field({ id, icon, label, placeholder, type, autoComplete, value, onChange }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('space-y-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          'block font-mono text-[11px] font-bold uppercase tracking-widest text-muted',
        )}
      >
        {label}
      </label>
      <div className={cm.cn('relative flex items-center')}>
        <span
          aria-hidden="true"
          className={cm.cn(
            'material-symbols-outlined pointer-events-none absolute left-3 text-lg text-muted/60',
          )}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            'h-10 w-full rounded border border-border bg-background pl-10 pr-3 font-mono text-sm text-text',
            'placeholder:text-muted/40',
            'transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        />
      </div>
    </div>
  )
}

export default ResetPassword
