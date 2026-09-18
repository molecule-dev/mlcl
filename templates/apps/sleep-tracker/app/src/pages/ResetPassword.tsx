import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthInput } from '../components/AuthInput.js'
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
  const [confirmPassword, setConfirmPassword] = useState('')

  const isSubmitting = confirmStatus === 'pending'
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — usePasswordReset surfaces it via confirmError
    }
  }

  return (
    <AuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'A fresh start' })}
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Choose something restful — at least 12 characters.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
        <AuthInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          icon="mail"
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        />
        <AuthInput
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          icon="key"
          placeholder={t(
            'resetPassword.tokenPlaceholder',
            {},
            { defaultValue: 'Reset code from email' },
          )}
          label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
        />
        <AuthInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          icon="lock"
          placeholder={t(
            'common.atLeast12Characters',
            {},
            { defaultValue: 'At least 12 characters' },
          )}
          label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
        />
        <AuthInput
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          icon="check"
          placeholder={t(
            'auth.signup.repeatYourPassword',
            {},
            { defaultValue: 'Repeat your password' },
          )}
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
        />

        {passwordMismatch ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {t('resetPassword.mismatchError', {}, { defaultValue: 'Passwords don’t match.' })}
          </div>
        ) : null}

        {confirmError ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {confirmError.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || passwordMismatch}
          className={cm.cn(
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('base'),
            'w-full bg-primary text-on-primary rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}
