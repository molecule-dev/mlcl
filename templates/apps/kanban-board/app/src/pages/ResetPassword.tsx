import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DriftboardAuthShell } from '../components/DriftboardAuthShell.js'
import { DriftInput } from '../components/DriftInput.js'

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

  const isLoggingIn = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (confirmError from usePasswordReset)
    }
  }

  return (
    <DriftboardAuthShell
      eyebrow={t(
        'resetPassword.eyebrow',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} · Final step' },
      )}
      headline={t('resetPassword.headline', {}, { defaultValue: 'Set a new password.' })}
      subline={t(
        'resetPassword.subline',
        {},
        {
          defaultValue:
            "Pick something memorable. We'll sign you back in to your workspace as soon as it's set.",
        },
      )}
      formTitle={t(
        'auth.resetPassword.chooseNewPassword',
        {},
        { defaultValue: 'Choose a new password' },
      )}
      formSubtitle={t(
        'resetPassword.formSubtitle',
        {},
        { defaultValue: 'Paste the recovery code from your email and pick a new password.' },
      )}
      footer={
        <p className="text-center text-on-surface-variant">
          {t('resetPassword.remember', {}, { defaultValue: 'Remembered it after all?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(`font-bold text-primary hover:opacity-80 transition-opacity`)}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
        <DriftInput
          label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
        <DriftInput
          label={t('resetPassword.token', {}, { defaultValue: 'Recovery code' })}
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder={t(
            'resetPassword.tokenPlaceholder',
            {},
            { defaultValue: 'paste from your email' },
          )}
        />
        <DriftInput
          label={t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
        <button
          type="submit"
          disabled={isLoggingIn}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
          )}
        >
          {isLoggingIn
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('resetPassword.submit', {}, { defaultValue: 'Reset password & sign in' })}
        </button>
        {confirmError ? (
          <p className={cm.cn(`text-sm text-error font-semibold`)}>{confirmError.message}</p>
        ) : null}
      </form>
    </DriftboardAuthShell>
  )
}

export default ResetPassword
