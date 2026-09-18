import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/clips', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      brandSubtitle={t(
        'resetPassword.brandSubtitle',
        {},
        { defaultValue: 'Set a fresh password and get back to copying.' },
      )}
      heading={t(
        'auth.resetPassword.setNewPasswordShort',
        {},
        { defaultValue: 'Set new password' },
      )}
      body={t(
        'resetPassword.body',
        { appName: APP_NAME },
        { defaultValue: 'Choose a new password for your {{appName}} account.' },
      )}
      footerSlot={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn('font-semibold hover:underline')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
          <span className={cm.cn('mx-2 text-on-surface-variant/50')}>·</span>
          <Link
            to="/forgot-password"
            className={cm.cn('font-semibold hover:underline')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
          </Link>
        </p>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'block text-on-surface',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="token"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'block text-on-surface',
            )}
          >
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </label>
          <input
            id="token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t(
              'auth.resetPassword.fromTheEmailWeSent',
              {},
              { defaultValue: 'From the email we sent' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'block text-on-surface',
            )}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-outline-variant bg-surface-container-lowest font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
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
              className={cm.cn(
                'absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {confirmError && (
          <div
            data-mol-id="reset-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md bg-error-container/30 text-error border border-error/30',
            )}
          >
            {confirmError.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 2),
            'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60',
          )}
          style={{ background: 'var(--color-primary)' }}
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
export { ResetPassword as ResetPasswordPage }
