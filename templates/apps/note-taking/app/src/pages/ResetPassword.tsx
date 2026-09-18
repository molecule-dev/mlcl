import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VersoAuthShell } from '../components/VersoAuthShell.js'
import { VersoInput } from '../components/VersoInput.js'

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

  const isResetting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional handling needed here
    }
  }

  return (
    <VersoAuthShell
      eyebrow={t('reset.eyebrow', {}, { defaultValue: 'Almost back in' })}
      headline={t('reset.headline', {}, { defaultValue: 'Choose a new password.' })}
      subline={t(
        'reset.subline',
        {},
        { defaultValue: 'Enter the code we just emailed you and pick something memorable.' },
      )}
      formTitle={t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
      formSubtitle={t(
        'reset.formSubtitle',
        {},
        { defaultValue: "You'll be signed in once it's saved." },
      )}
      footer={
        <p className={cm.cn('text-center text-on-surface-variant')}>
          {t('reset.changedMind', {}, { defaultValue: 'Changed your mind?' })}{' '}
          <Link
            to="/login"
            className={cm.cn('font-bold text-primary hover:opacity-80 transition-opacity')}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(5))}>
        <VersoInput
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <VersoInput
          label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder="123456"
          hint={t('reset.tokenHint', {}, { defaultValue: 'Pasted from your inbox.' })}
        />
        <VersoInput
          label={t('reset.newPassword', {}, { defaultValue: 'New password' })}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder="••••••••"
          hint={t('reset.passwordHint', {}, { defaultValue: 'At least 8 characters.' })}
        />
        <button
          type="submit"
          disabled={isResetting}
          className={cm.cn(
            cm.sp('py', 3),
            'rounded-xl font-bold text-white shadow-md',
            'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity disabled:opacity-60',
          )}
        >
          {isResetting
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('reset.submit', {}, { defaultValue: 'Save and sign in' })}
        </button>
        {confirmError ? (
          <p className={cm.cn('text-sm text-error font-semibold')}>{confirmError.message}</p>
        ) : null}
      </form>
    </VersoAuthShell>
  )
}

export default ResetPassword
