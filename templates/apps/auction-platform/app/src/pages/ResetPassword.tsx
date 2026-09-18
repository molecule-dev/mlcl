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
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'
  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/auctions', { replace: true })
    } catch (_error) {
      // safe to ignore: error state in usePasswordReset hook surfaces this to the UI
    }
  }

  return (
    <AuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'New password' })}
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subtext={t(
        'resetPassword.subtext',
        {},
        {
          defaultValue:
            "Choose a strong password — you'll be signed in automatically once it's saved.",
        },
      )}
      bottomLinkText={t(
        'auth.login.rememberedYourPassword',
        {},
        { defaultValue: 'Remembered your password?' },
      )}
      bottomLinkLabel={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      bottomLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className={cm.stack(4)}>
        {!searchParams.get('token') ? (
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
            </span>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t(
                'auth.resetPassword.pasteTokenFromEmail',
                {},
                { defaultValue: 'Paste the token from your email' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:border-primary text-sm',
              )}
            />
          </label>
        ) : null}
        {!searchParams.get('email') ? (
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg bg-surface-container-low border border-outline-variant focus:outline-none focus:border-primary text-sm',
              )}
            />
          </label>
        ) : null}
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-password"
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              aria-label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
              className={cm.cn(
                'flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn('text-on-surface-variant hover:text-on-surface')}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-confirm"
            className={cm.cn('text-xs font-bold uppercase tracking-widest text-on-surface-variant')}
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface-container-low border border-outline-variant focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant')}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Re-enter your password' },
              )}
              aria-label={t(
                'auth.signup.confirmPassword',
                {},
                { defaultValue: 'Confirm password' },
              )}
              className={cm.cn(
                'flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant',
              )}
            />
          </div>
          {mismatch ? (
            <span className={cm.cn('text-xs font-semibold text-error')}>
              {t(
                'auth.signup.passwordsDoNotMatchPeriod',
                {},
                { defaultValue: 'Passwords do not match.' },
              )}
            </span>
          ) : null}
        </div>

        {confirmError ? (
          <div
            role="alert"
            data-mol-id="reset-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'text-sm text-center rounded-lg',
              'bg-error-container text-on-error-container',
            )}
          >
            {confirmError.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 3),
            cm.sp('mt', 2),
            'rounded-full text-base font-extrabold text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
          }}
        >
          {isSubmitting
            ? t('resetPassword.submitting', {}, { defaultValue: 'Saving password…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
