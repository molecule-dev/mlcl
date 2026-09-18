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
  const isPending = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in confirmError from usePasswordReset hook state
    }
  }

  return (
    <AuthShell
      footer={
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(
              'font-bold text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
          <span className={cm.cn('mx-3 text-on-surface-variant/40')}>|</span>
          <Link
            to="/forgot-password"
            className={cm.cn(
              'font-bold text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('common.requestANewLink', {}, { defaultValue: 'Request a new link' })}
          </Link>
        </p>
      }
    >
      <div className={cm.textCenter}>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'font-display text-on-surface',
          )}
        >
          {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'resetPassword.subtitle',
            {},
            { defaultValue: 'Enter your new password to regain access to the kitchen.' },
          )}
        </p>
      </div>
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')} onSubmit={handleSubmit}>
        <Field
          id="email"
          type="email"
          autoComplete="email"
          icon="mail"
          label={t('resetPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
          value={email}
          onChange={setEmail}
        />
        <Field
          id="token"
          type="text"
          icon="vpn_key"
          label={t('resetPassword.tokenLabel', {}, { defaultValue: 'Reset Token' })}
          placeholder={t(
            'auth.resetPassword.fromTheEmailWeSent',
            {},
            { defaultValue: 'From the email we sent' },
          )}
          value={token}
          onChange={setToken}
        />

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New Password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-transparent focus-within:border-primary',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('mr', 3),
                cm.textSize('xl'),
                'material-symbols-outlined text-outline',
              )}
            >
              lock
            </span>
            <input
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
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 0),
                cm.fontWeight('medium'),
                'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
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
        )}

        <button
          type="submit"
          disabled={isPending}
          className={cm.cn(
            cm.sp('py', 4),
            cm.roundedFull,
            cm.textSize('lg'),
            cm.sp('mt', 2),
            cm.fontWeight('bold'),
            'text-on-primary bg-gradient-to-br from-primary to-tertiary hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-60',
          )}
        >
          {isPending
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}

interface FieldProps {
  id: string
  type: string
  icon: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  placeholder?: string
}

function Field({ id, type, icon, label, value, onChange, autoComplete, placeholder }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-transparent focus-within:border-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
        />
      </div>
    </div>
  )
}
