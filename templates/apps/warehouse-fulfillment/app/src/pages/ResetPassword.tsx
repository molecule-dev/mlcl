import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { FormField } from './Login.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token] = useState(searchParams.get('token') || '')
  const [email] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const isSubmitting = confirmStatus === 'pending'
  const mismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mismatch) return
    try {
      await confirmReset({ token, password })
      if (email) {
        await login({ email, password })
      }
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // confirmError state from usePasswordReset surfaces this to the UI
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'reset.subheading',
        {},
        {
          defaultValue:
            'Choose something your team will remember on the floor — at least 12 characters.',
        },
      )}
      bottomLinkText={t('reset.changedMind', {}, { defaultValue: 'Changed your mind?' })}
      bottomLinkLabel={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
        <FormField
          icon="lock"
          label={t('reset.password', {}, { defaultValue: 'New password' })}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••••••"
          required
        />
        <FormField
          icon="lock_reset"
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••••••"
          required
        />

        {mismatch && (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container border border-error/20',
            )}
          >
            {t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )}
          </p>
        )}

        {confirmError && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container border border-error/20',
            )}
          >
            {confirmError.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || mismatch}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.h(12),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
          )}
        >
          {isSubmitting
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="check">
            check
          </span>
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
