import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  AuthAlert,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
} from '../components/AuthFormAtoms.js'
import { SiftAuthShell } from '../components/SiftAuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') ?? '')
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
  const [mismatch, setMismatch] = useState<string | null>(null)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatch(null)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error is tracked in confirmError hook state; no local handling needed
    }
  }

  return (
    <SiftAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Pick something memorable. We will sign you in once you save.' },
      )}
      footer={
        <p>
          {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}{' '}
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline underline-offset-4',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form
        data-mol-id="reset-password-form"
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
      >
        {(mismatch || confirmError) && (
          <AuthAlert tone="error">{mismatch ?? confirmError?.message}</AuthAlert>
        )}
        <AuthTextField
          id="email"
          label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          value={email}
          onChange={setEmail}
          icon="mail"
          type="email"
          autoComplete="email"
        />
        <AuthTextField
          id="token"
          label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          value={token}
          onChange={setToken}
          icon="key"
        />
        <AuthPasswordField
          id="password"
          label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />
        <AuthPasswordField
          id="confirm"
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          value={confirm}
          onChange={setConfirm}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />
        <AuthSubmitButton
          loading={isSubmitting}
          loadingLabel={t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })}
          label={t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        />
      </form>
    </SiftAuthShell>
  )
}
