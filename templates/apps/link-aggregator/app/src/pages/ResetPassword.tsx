import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell, BrandHeader, Field } from './Login.js'

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

  const submitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/feed', { replace: true })
    } catch (_error) {
      // error is surfaced via confirmError from the hook
    }
  }

  return (
    <AuthShell>
      <BrandHeader />
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('resetPassword.heading', {}, { defaultValue: 'Set a new password.' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'resetPassword.subtitle',
            {},
            { defaultValue: 'Choose a strong, unique password to finish unlocking your account.' },
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <Field
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="alternate_email"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface',
            )}
          />
        </Field>
        <Field
          label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          icon="key"
        >
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface font-mono',
            )}
          />
        </Field>
        <Field
          label={t('resetPassword.password', {}, { defaultValue: 'New password' })}
          icon="lock"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface',
            )}
          />
        </Field>
        <Field
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          icon="lock"
        >
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('base'),
              'flex-1 bg-transparent outline-none text-on-surface',
            )}
          />
        </Field>

        {confirm && password !== confirm && (
          <p
            role="alert"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-lg bg-error/10 text-error')}
          >
            {t('resetPassword.mismatch', {}, { defaultValue: 'Passwords don\u2019t match.' })}
          </p>
        )}

        {confirmError && (
          <p
            role="alert"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-lg bg-error/10 text-error')}
          >
            {confirmError.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || password !== confirm}
          className={cm.cn(
            cm.sp('py', 3),
            cm.roundedFull,
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors shadow-md',
          )}
        >
          {submitting
            ? t('resetPassword.submitting', {}, { defaultValue: 'Resetting\u2026' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>

        <footer className={cm.cn(cm.textCenter, cm.textSize('sm'))}>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline decoration-2 underline-offset-2',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </footer>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
