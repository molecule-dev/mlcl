import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AulaAuthShell } from '../components/AulaAuthShell.js'

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
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in confirmError from the hook — no local handling needed
    }
  }

  return (
    <AulaAuthShell
      eyebrow={t(
        'auth.resetPassword.setNewPasswordShort',
        {},
        { defaultValue: 'Set new password' },
      )}
      title={t('resetPassword.title', {}, { defaultValue: 'Pick a fresh password' })}
      subtitle={t(
        'resetPassword.subtitle',
        {},
        {
          defaultValue:
            'Make it long enough to be hard to guess and short enough to be typed quickly.',
        },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.stack(5)}>
        {confirmError && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {confirmError.message}
          </div>
        )}
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
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
            placeholder={t(
              'resetPassword.emailPlaceholder',
              {},
              { defaultValue: 'you@school.edu' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
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
              'auth.resetPassword.pasteTokenFromEmail',
              {},
              { defaultValue: 'Paste the token from your email' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all font-mono',
            )}
          />
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
        </label>
        <label className={cm.stack(2)}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t(
              'resetPassword.confirmPasswordPlaceholder',
              {},
              { defaultValue: 'Re-enter the new password' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container-low border-0 text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary/30 outline-none transition-all',
            )}
          />
          {!passwordsMatch && (
            <span className={cm.cn(cm.textSize('xs'), 'text-error')}>
              {t('resetPassword.mismatch', {}, { defaultValue: 'The passwords don’t match yet.' })}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={isSubmitting || !passwordsMatch}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.sp('px', 5),
            'w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60',
          )}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
          {!isSubmitting && (
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
          )}
        </button>
      </form>
    </AulaAuthShell>
  )
}

export default ResetPassword
