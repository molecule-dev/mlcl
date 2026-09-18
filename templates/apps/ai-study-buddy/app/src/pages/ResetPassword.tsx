import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { status: loginStatus, error: loginError, login } = useLogin()

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

  const isSubmitting = loginStatus === 'pending'
  const mismatch = !!password && !!confirm && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    // The molecule user resource exposes password reset via the logIn
    // handler with a `passwordResetToken` body field — there's no
    // dedicated reset-confirm endpoint, so we skip the framework-default
    // `confirmReset` call and go straight to login().
    try {
      await login({ email, password, passwordResetToken: token } as Parameters<typeof login>[0])
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* error tracked in hook state */
    }
  }

  return (
    <AuthShell dataMolId="page-reset-password">
      <AuthBrandHeader />

      <div
        className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), cm.sp('mt', 2))}
      >
        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-center text-on-surface')}
        >
          {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'serif-text italic text-center text-on-surface-variant',
          )}
        >
          {t(
            'resetPassword.subtitle',
            {},
            { defaultValue: 'Pick something memorable — and unique.' },
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {!searchParams.get('email') ? (
          <Field
            id="email"
            icon="mail"
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoComplete="email"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
          />
        ) : null}
        {!searchParams.get('token') ? (
          <Field
            id="token"
            icon="vpn_key"
            label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
            value={token}
            onChange={setToken}
            required
            placeholder={t(
              'auth.resetPassword.pasteTokenFromEmail',
              {},
              { defaultValue: 'Paste the token from your email' },
            )}
          />
        ) : null}

        <PasswordField
          id="password"
          dataMolId="reset-password"
          toggleDataMolId="reset-toggle-password"
          label={t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm"
          dataMolId="reset-confirm"
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          value={confirm}
          onChange={setConfirm}
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />

        {mismatch ? (
          <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-error')}>
            {t(
              'auth.signup.passwordsDontMatchPeriod',
              {},
              { defaultValue: "Passwords don't match." },
            )}
          </p>
        ) : null}

        {loginError ? (
          <div
            data-mol-id="reset-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {loginError.message}
          </div>
        ) : null}

        <button
          type="submit"
          data-mol-id="reset-submit"
          disabled={isSubmitting || mismatch}
          className={cm.cn(
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-60 transition-opacity active:scale-95',
          )}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.textCenter,
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
        <Link
          to="/login"
          data-mol-id="reset-login-link"
          className={'font-bold text-primary hover:underline'}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      </p>
    </AuthShell>
  )
}

interface FieldProps {
  id: string
  dataMolId?: string
  icon: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
  placeholder: string
}

function Field({
  id,
  dataMolId,
  icon,
  label,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
  placeholder,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
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
          'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
        )}
      >
        <span
          className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          data-mol-id={dataMolId}
          type={type}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('medium'),
            'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
          )}
        />
      </div>
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  dataMolId?: string
  toggleDataMolId?: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  autoComplete?: string
}

function PasswordField({
  id,
  dataMolId,
  toggleDataMolId,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: PasswordFieldProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
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
          'relative rounded-t-lg bg-surface-container-low border-b-2 border-transparent focus-within:border-primary py-3.5 transition-colors',
        )}
      >
        <span
          className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-outline')}
          aria-hidden="true"
        >
          lock
        </span>
        <input
          id={id}
          data-mol-id={dataMolId}
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('medium'),
            'border-none bg-transparent p-0 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0',
          )}
        />
        <button
          type="button"
          data-mol-id={toggleDataMolId}
          onClick={onToggle}
          aria-label={
            show
              ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.cn(cm.sp('ml', 2), 'text-outline hover:text-primary transition-colors')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}
