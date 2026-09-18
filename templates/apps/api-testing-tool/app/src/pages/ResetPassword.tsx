import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

const INPUT_BG = 'var(--color-background)'
const BORDER = 'var(--color-border)'

const fieldClass = (cm: ReturnType<typeof getClassMap>) =>
  cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    cm.textSize('sm'),
    'rounded-md font-mono transition-colors',
  )

const fieldStyle = {
  backgroundColor: INPUT_BG,
  border: `1px solid ${BORDER}`,
  color: 'var(--color-text-primary)',
} as const

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
  const [mismatchError, setMismatchError] = useState<string | null>(null)
  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/workspace', { replace: true })
    } catch (_error) {
      // hook owns error state — usePasswordReset surfaces it via confirmError
    }
  }

  return (
    <AuthShell
      title={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subtitle={t(
        'resetPassword.subtitle',
        {},
        { defaultValue: 'Choose a strong password you have not used before.' },
      )}
      statusLabel={t('resetPassword.statusLabel', {}, { defaultValue: 'reset · token verified' })}
      footer={
        <Link
          to="/login"
          className={cm.cn('inline-flex items-center gap-1 font-bold hover:underline')}
          style={{ color: 'var(--color-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
            htmlFor="email"
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t(
              'auth.passwordPlaceholderCompanyEmail',
              {},
              { defaultValue: 'you@company.com' },
            )}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="reset-email"
          />
        </div>

        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
            htmlFor="token"
          >
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </label>
          <input
            id="token"
            type="text"
            required
            placeholder={t(
              'resetPassword.tokenPlaceholder',
              {},
              { defaultValue: 'paste from email' },
            )}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="reset-token"
          />
        </div>

        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
            htmlFor="password"
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="reset-password"
          />
        </div>

        <div>
          <label
            className={cm.cn(
              'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
            htmlFor="confirmPassword"
          >
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={fieldClass(cm)}
            style={fieldStyle}
            data-mol-id="reset-confirm-password"
          />
        </div>

        {confirmError || mismatchError ? (
          <div
            data-mol-id="reset-error"
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-md text-center',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
              color: 'var(--color-error)',
            }}
          >
            {mismatchError || confirmError?.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
          )}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            boxShadow:
              '0 12px 28px -12px color-mix(in srgb, var(--color-primary) 60%, transparent)',
          }}
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
