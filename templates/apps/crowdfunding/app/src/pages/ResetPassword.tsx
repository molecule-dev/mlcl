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
  const [showPassword, setShowPassword] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <AuthShell
      altLink={
        <span>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
          <span className={cm.cn(cm.sp('mx', 3), 'text-on-surface-variant/40')}>|</span>
          <Link
            to="/forgot-password"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
          </Link>
        </span>
      }
    >
      <div className={cm.textCenter}>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface',
          )}
        >
          {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'resetPassword.subtitle',
            {},
            { defaultValue: 'Choose a strong password to regain access.' },
          )}
        </p>
      </div>
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="email"
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
              aria-hidden="true"
            >
              mail
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
              )}
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="token"
          >
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
              aria-hidden="true"
            >
              vpn_key
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
              )}
              id="token"
              type="text"
              required
              placeholder={t(
                'auth.resetPassword.fromTheEmailWeSent',
                {},
                { defaultValue: 'From the email we sent' },
              )}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="password"
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-lg py-3 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50',
              )}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
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
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-lg',
            )}
          >
            {confirmError.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-lg text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          }}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}
