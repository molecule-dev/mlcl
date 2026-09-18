import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ArgentAuthShell } from '../components/ArgentAuthShell.js'
import { FloatingInput } from '../components/FloatingInput.js'

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

  const isLoggingIn = confirmStatus === 'pending'
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via confirmReset/login status
    }
  }

  return (
    <ArgentAuthShell
      eyebrow={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      heading={t('resetPassword.heading', {}, { defaultValue: 'Choose a strong new password' })}
      subheading={t(
        'resetPassword.subheading',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} will sign you in automatically once your password is set.' },
      )}
      footerLink={{
        to: '/login',
        promptKey: 'resetPassword.backPrompt',
        promptDefault: "Don't need to reset?",
        ctaKey: 'resetPassword.backCta',
        ctaDefault: 'Back to sign in',
      }}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <FloatingInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
        />
        <FloatingInput
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder={t(
            'resetPassword.tokenPlaceholder',
            {},
            { defaultValue: 'Reset token from email' },
          )}
        />
        <FloatingInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder={t('resetPassword.passwordPlaceholder', {}, { defaultValue: 'New password' })}
        />
        <FloatingInput
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder={t(
            'auth.signup.confirmNewPassword',
            {},
            { defaultValue: 'Confirm new password' },
          )}
        />

        {passwordMismatch ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>
            {t(
              'auth.signup.passwordsDontMatchPeriod',
              {},
              { defaultValue: "Passwords don't match." },
            )}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoggingIn || passwordMismatch}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {isLoggingIn ? 'progress_activity' : 'lock_reset'}
          </span>
          {isLoggingIn
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>

        {confirmError ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error/10 text-error border border-error/20',
            )}
          >
            {confirmError.message}
          </p>
        ) : null}
      </form>
    </ArgentAuthShell>
  )
}
