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
  const [confirmPassword, setConfirmPassword] = useState('')

  const isSubmitting = confirmStatus === 'pending'
  const passwordsMatch = password.length === 0 || password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/boards', { replace: true })
    } catch (_error) {
      // error state is tracked and surfaced by the confirmReset/login hooks
    }
  }

  return (
    <AuthShell
      eyebrow={t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
      heading={t(
        'auth.resetPassword.setNewPasswordShort',
        {},
        { defaultValue: 'Set new password' },
      )}
      description={t(
        'resetPassword.description',
        {},
        {
          defaultValue:
            'Enter your new workspace password. Ensure it meets security compliance guidelines.',
        },
      )}
      footer={
        <Link to="/login" className={cm.cn('font-semibold text-primary hover:underline')}>
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </span>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder={t(
              'resetPassword.tokenPlaceholder',
              {},
              { defaultValue: 'Paste the link token' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border border-outline-variant/60 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('base'),
              'rounded-lg border bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
              passwordsMatch ? 'border-outline-variant/60 focus:border-primary' : 'border-error',
            )}
          />
          {!passwordsMatch && (
            <span className={cm.cn(cm.textSize('xs'), 'text-error')}>
              {t(
                'auth.signup.passwordsDoNotMatchPeriod',
                {},
                { defaultValue: 'Passwords do not match.' },
              )}
            </span>
          )}
        </label>

        {confirmError && (
          <div
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('p', 3),
              'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
            )}
            role="alert"
          >
            {confirmError.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !passwordsMatch}
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-full bg-primary text-on-primary disabled:opacity-60 hover:bg-primary-active transition-colors',
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

export default ResetPassword
