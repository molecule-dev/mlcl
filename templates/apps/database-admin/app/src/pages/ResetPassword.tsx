import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const token = params.get('token') ?? ''

  const isSubmitting = confirmStatus === 'pending'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      /* error rendered below via confirmError */
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      tagline={t(
        'resetPassword.tagline',
        { appName: APP_NAME },
        { defaultValue: 'Pick something strong — {{appName}} will never email it.' },
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
          id="reset-password"
          label={t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          icon="lock"
          value={password}
          onChange={setPassword}
        />
        <Field
          id="reset-password-confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          icon="check"
          value={confirm}
          onChange={setConfirm}
        />

        {(mismatch || confirmError) && (
          <div
            role="alert"
            data-mol-id="reset-password-error"
            className={cm.cn(
              'rounded border border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error',
            )}
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDoNotMatchPeriod',
                  {},
                  { defaultValue: 'Passwords do not match.' },
                )
              : confirmError?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            'group mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-headline font-bold text-on-primary',
            'transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
            'disabled:opacity-60',
          )}
        >
          <span>
            {isSubmitting
              ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
              : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
          </span>
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm font-bold')}>
            keyboard_return
          </span>
        </button>
      </form>
    </AuthShell>
  )
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
}: {
  id: string
  label: string
  icon: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('space-y-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          'block font-label text-[11px] font-bold uppercase tracking-widest text-muted',
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
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            'h-10 w-full rounded border border-border bg-bg pl-10 pr-3 font-mono text-sm text-text',
            'placeholder:text-muted/40',
            'transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        />
      </div>
    </div>
  )
}

export default ResetPassword
