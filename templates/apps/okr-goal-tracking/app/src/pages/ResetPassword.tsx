import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // tracked in hook state — the hook surfaces confirmError; no action needed here
    }
  }

  return (
    <AuthShell
      heading={t('resetPassword.heading', {}, { defaultValue: 'Set a new password.' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue:
            'Pick something strong — eight characters minimum, mix in numbers if you can.',
        },
      )}
      footerPrompt={
        <span>
          {t('resetPassword.backPrompt', {}, { defaultValue: 'Decided not to reset? ' })}
          <Link to="/login" className={cm.cn('font-bold text-indigo-700 hover:text-indigo-900')}>
            {t('resetPassword.backLink', {}, { defaultValue: 'Sign in instead' })}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(4))}>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('resetPassword.emailPlaceholder', {}, { defaultValue: 'you@team.com' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full rounded-xl border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </span>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t(
              'auth.resetPassword.pasteTokenFromEmail',
              {},
              { defaultValue: 'Paste the token from your email' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full rounded-xl border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all',
            )}
          />
        </label>
        <label className={cm.cn(cm.stack(1))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full rounded-xl border border-outline-variant bg-surface text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all',
            )}
          />
        </label>
        {confirmError && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-lg bg-error-light text-error border border-red-200',
            )}
          >
            {confirmError.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'w-full rounded-xl text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-secondary) 100%)',
          }}
        >
          {isSubmitting
            ? t('resetPassword.resetting', {}, { defaultValue: 'Updating password…' })
            : t('resetPassword.reset', {}, { defaultValue: 'Update password & sign in' })}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
