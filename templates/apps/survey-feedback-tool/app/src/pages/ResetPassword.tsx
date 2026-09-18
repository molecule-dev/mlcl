import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()

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
  const [showPassword, setShowPassword] = useState(false)

  const loading = confirmStatus === 'pending'
  const error =
    confirmError instanceof Error
      ? confirmError.message
      : confirmError
        ? t(
            'resetPassword.failed',
            {},
            { defaultValue: 'Could not reset password. The link may be expired.' },
          )
        : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      try {
        await login({ email, password })
      } catch (_error) {
        // OK if auto-login fails — user can sign in manually below
      }
      clearAuthForm()
      navigate('/surveys', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — no additional handling needed here
    }
  }

  return (
    <AuthShell
      heading={t(
        'auth.resetPassword.chooseNewPassword',
        {},
        { defaultValue: 'Choose a new password' },
      )}
      subheading={t(
        'resetPassword.subheading',
        { app: APP_NAME },
        { defaultValue: 'Pick something at least 8 characters and unique to {{app}}.' },
      )}
      footer={
        <>
          <span>{t('resetPassword.remembered', {}, { defaultValue: 'Already updated?' })}</span>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))} onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-md bg-error-light text-[color:var(--color-on-error)]',
            )}
          >
            {error}
          </div>
        )}
        {!searchParams.get('token') && (
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
            </span>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
              )}
              placeholder={t(
                'auth.resetPassword.pasteTokenFromEmail',
                {},
                { defaultValue: 'Paste the token from your email' },
              )}
            />
          </label>
        )}
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant',
              )}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
            />
          </div>
        </label>
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </span>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              'h-12 rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-shadow',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-transparent border-none focus:outline-none focus:ring-0 text-on-surface',
              )}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={loading}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {loading
            ? t('resetPassword.submitting', {}, { defaultValue: 'Updating password…' })
            : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
