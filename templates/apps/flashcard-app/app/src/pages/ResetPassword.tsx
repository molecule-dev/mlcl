import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'
import { AuthField } from './Login.js'

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
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is surfaced via the auth hook's own state — no local handling needed
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subtitle={t(
        'resetPassword.subtitle',
        {},
        { defaultValue: 'Pick something strong. You will be signed in afterwards.' },
      )}
      showSamplePreview={false}
      footer={
        <p className={cm.textCenter}>
          <Link
            to="/login"
            className={cm.cn(
              'font-bold text-primary hover:underline inline-flex items-center gap-1',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_back
            </span>
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <AuthField
          id="reset-email"
          type="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="mail"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          id="reset-token"
          type="text"
          label={t('resetPassword.tokenLabel', {}, { defaultValue: 'Reset token (from email)' })}
          icon="vpn_key"
          value={token}
          onChange={setToken}
          required
        />
        <AuthField
          id="reset-password"
          type="password"
          label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          icon="lock"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
        <AuthField
          id="reset-confirm"
          type="password"
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          icon="lock_reset"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          required
        />

        {(mismatch || confirmError) && (
          <p
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/50 text-on-error-container border border-error/30',
            )}
            role="alert"
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDoNotMatchPeriod',
                  {},
                  { defaultValue: 'Passwords do not match.' },
                )
              : confirmError?.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'rounded-2xl bg-primary text-on-primary text-sm shadow-md hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:hover:scale-100',
          )}
          data-mol-id="reset-submit"
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}
