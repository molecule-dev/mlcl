import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EmbarkAuthShell } from '../components/EmbarkAuthShell.js'

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
  const [mismatch, setMismatch] = useState(false)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      if (email) {
        await login({ email, password })
      }
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <EmbarkAuthShell
      heading={t('auth.resetPassword.heading', {}, { defaultValue: 'Set a new password.' })}
      subheading={t(
        'auth.resetPassword.subheading',
        {},
        { defaultValue: 'Pick something you’ll remember — at least 8 characters.' },
      )}
      error={
        mismatch
          ? t(
              'auth.signup.passwordsDoNotMatchPeriod',
              {},
              { defaultValue: 'Passwords do not match.' },
            )
          : confirmError?.message
      }
      panelHeadline={t(
        'auth.resetPassword.panel.headline',
        {},
        { defaultValue: 'Almost back in.' },
      )}
      panelBody={t(
        'auth.resetPassword.panel.body',
        {},
        {
          defaultValue:
            'Save a fresh password and we’ll drop you right back into your onboarding journey.',
        },
      )}
      footer={
        <Link to="/login" className="font-bold text-primary">
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.flex({ direction: 'col', gap: 'md' })}>
        {!searchParams.get('email') && (
          <FormField cm={cm} label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="bg-surface-container-lowest transition-all"
              style={{ padding: '14px 16px' }}
            />
          </FormField>
        )}
        {!searchParams.get('token') && (
          <FormField
            cm={cm}
            label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          >
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="one-time-code"
              required
              className="bg-surface-container-lowest transition-all"
              style={{ padding: '14px 16px' }}
            />
          </FormField>
        )}
        <FormField
          cm={cm}
          label={t('auth.resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </FormField>
        <FormField
          cm={cm}
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
        >
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className="bg-surface-container-lowest transition-all"
            style={{ padding: '14px 16px' }}
          />
        </FormField>
        <button
          type="submit"
          disabled={isSubmitting}
          className="font-bold text-white transition-all duration-200"
          style={{
            marginTop: '8px',
            padding: '14px',
            borderRadius: '12px',
            background:
              'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
            boxShadow: '0 10px 24px -10px rgba(13, 148, 136, 0.5)',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </EmbarkAuthShell>
  )
}

function FormField({
  cm,
  label,
  children,
}: {
  cm: ReturnType<typeof getClassMap>
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className={cm.cn(
          'block text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant',
        )}
        style={{ marginBottom: '8px' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
