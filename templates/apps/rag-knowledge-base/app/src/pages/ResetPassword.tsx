import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_GRADIENT } from '../branding.js'
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
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/ask', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via confirmError — no action needed here
    }
  }

  return (
    <AuthShell
      title={t('auth.resetPassword.setNewPasswordShort', {}, { defaultValue: 'Set new password' })}
      subtitle={t(
        'resetPassword.subtitle',
        {},
        { defaultValue: 'Choose a strong password to protect your knowledge base.' },
      )}
      footerPrompt={
        <Link
          to="/login"
          className={cm.cn(
            'font-bold hover:underline decoration-2 underline-offset-4 ml-1 text-primary',
          )}
        >
          {t('resetPassword.backToSignIn', {}, { defaultValue: '\u2190 Back to Sign In' })}
        </Link>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        {!searchParams.get('email') ? (
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('ml', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
                style={{ fontSize: 20 }}
                aria-hidden="true"
              >
                mail
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
                )}
              />
            </div>
          </div>
        ) : null}

        {!searchParams.get('token') ? (
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            <label
              htmlFor="token"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('ml', 1),
                'uppercase tracking-widest text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 4),
                'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
                style={{ fontSize: 20 }}
                aria-hidden="true"
              >
                key
              </span>
              <input
                id="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.fontWeight('medium'),
                  'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60 font-mono tabular-nums',
                )}
              />
            </div>
          </div>
        ) : null}

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder={t(
                'resetPassword.passwordPlaceholder',
                {},
                { defaultValue: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
              )}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
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
              className={cm.cn('ml-2 text-on-surface-variant hover:text-primary transition-colors')}
            >
              <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 20 }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="confirm"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-low rounded-xl py-3.5 border border-outline-variant focus-within:border-primary transition-colors',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              lock_reset
            </span>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
              )}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
              )}
            />
          </div>
        </div>

        {mismatch ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {t('resetPassword.mismatch', {}, { defaultValue: 'Passwords don\u2019t match.' })}
          </div>
        ) : null}
        {confirmError ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {confirmError.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-full text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20',
          )}
          style={{ background: BRAND_GRADIENT }}
        >
          {isSubmitting
            ? t('resetPassword.submitting', {}, { defaultValue: 'Resetting\u2026' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}
