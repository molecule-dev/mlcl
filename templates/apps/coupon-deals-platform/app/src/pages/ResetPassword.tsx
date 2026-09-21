import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthAlert, AuthPasswordField, AuthSubmitButton } from '../components/AuthFormAtoms.js'
import { SnagrAuthShell } from '../components/SnagrAuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t(
          'resetPassword.mismatch',
          {},
          { defaultValue: 'Passwords do not match — please retype.' },
        ),
      )
      return
    }
    if (!token) {
      setError(
        t(
          'resetPassword.missingToken',
          {},
          { defaultValue: 'This reset link is missing its token. Request a new one.' },
        ),
      )
      return
    }
    setLoading(true)
    try {
      await http.post('/users/reset-password', { token, password })
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'resetPassword.error',
              {},
              { defaultValue: 'Could not reset your password. Try requesting a new link.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SnagrAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Pick something memorable but tough to guess.' },
      )}
      footer={
        <p>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline underline-offset-4',
            )}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      <form
        data-mol-id="reset-password-form"
        onSubmit={handleSubmit}
        className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
      >
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <AuthPasswordField
          id="password"
          label={t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
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
          loading={loading}
          loadingLabel={t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })}
          label={t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        />
      </form>
    </SnagrAuthShell>
  )
}
