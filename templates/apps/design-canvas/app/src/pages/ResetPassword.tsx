import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in hook state (confirmError) and surfaced by the form
    }
  }

  const inputClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('medium'),
    cm.textSize('sm'),
    'bg-surface-container-low border border-outline-variant/40 rounded-xl focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
  )
  const labelClass = cm.cn(
    cm.fontWeight('bold'),
    cm.textSize('xs'),
    'uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <AuthShell
      eyebrow={t(
        'auth.resetPassword.setNewPasswordShort',
        {},
        { defaultValue: 'Set new password' },
      )!}
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })!}
      subheading={t(
        'reset.subheading',
        {},
        { defaultValue: 'Choose a strong password — at least 8 characters with one number.' },
      )!}
      bottomLink={{
        to: '/login',
        prompt: t('reset.backPrompt', {}, { defaultValue: 'Need a different email?' })!,
        cta: t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })!,
      }}
    >
      <form onSubmit={handleSubmit} data-mol-id="reset-form" className={cm.cn(cm.stack(5))}>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </span>
          <input
            id="reset-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder={t(
              'auth.resetPassword.pasteTokenFromEmail',
              {},
              { defaultValue: 'Paste the token from your email' },
            )!}
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('reset.password', {}, { defaultValue: 'New password' })}
          </span>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </label>
        <label className={cm.cn(cm.stack(2))}>
          <span className={labelClass}>
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </span>
          <input
            id="reset-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
          {confirm && confirm !== password && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-error')}>
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
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {confirmError.message}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting || (confirm !== '' && confirm !== password)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.01] transition-transform disabled:opacity-60',
          )}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('reset.cta', {}, { defaultValue: 'Reset password & sign in' })}
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
