import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { VendryAuthShell } from '../components/VendryAuthShell.js'

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
  const [mismatch, setMismatch] = useState<string | null>(null)

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMismatch(null)
    if (password !== confirmPassword) {
      setMismatch(t('resetPassword.mismatch', {}, { defaultValue: "Passwords don't match yet." }))
      return
    }
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/catalog', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field
    }
  }

  const inputBase = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.w('full'),
    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none transition-colors',
  )

  return (
    <VendryAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue:
            'Enter the code we emailed you, then choose a new password to finish signing back in.',
        },
      )}
      bottomPrompt={
        <>
          {t('resetPassword.didntGetCode', {}, { defaultValue: "Didn't get a code?" })}{' '}
          <Link
            to="/forgot-password"
            className={'font-semibold text-orange-700 dark:text-primary hover:underline'}
          >
            {t('resetPassword.resend', {}, { defaultValue: 'Send a new one' })}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.stack(5))}>
        <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <span className="font-semibold text-on-surface-variant">
            {t('resetPassword.emailLabel', {}, { defaultValue: 'Account email' })}
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputBase}
          />
        </label>

        <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <span className="font-semibold text-on-surface-variant">
            {t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          </span>
          <input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={`${APP_NAME.toUpperCase()}-XXXX-XXXX`}
            className={cm.cn(inputBase, 'tracking-widest font-mono')}
          />
        </label>

        <div className={cm.cn(cm.grid({ cols: 1, gap: 'sm' }), 'md:grid-cols-2')}>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('resetPassword.newPasswordLabel', {}, { defaultValue: 'New password' })}
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputBase}
            />
          </label>
          <label className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
            <span className="font-semibold text-on-surface-variant">
              {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputBase}
            />
          </label>
        </div>

        {(confirmError || mismatch) && (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              cm.textCenter,
              'rounded-xl bg-error/10 text-error',
            )}
          >
            {mismatch ?? confirmError?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.sp('py', 4),
            cm.roundedFull,
            'bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 disabled:opacity-60',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            lock_reset
          </span>
          {isSubmitting
            ? t('resetPassword.submitting', {}, { defaultValue: 'Updating password…' })
            : t('resetPassword.submit', {}, { defaultValue: 'Reset & sign in' })}
        </button>
      </form>
    </VendryAuthShell>
  )
}

export default ResetPassword
