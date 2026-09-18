import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DendriteAuthCard } from '../components/DendriteAuthCard.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success). The reset link's ?email= seeds it
  // and wins over any stored value; otherwise the email typed on Forgot
  // carries over.
  const urlEmail = searchParams.get('email') ?? undefined
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
      // tracked in hook state via confirmError
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
  )

  return (
    <DendriteAuthCard
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Pick something memorable. We’ll log you back in automatically.' },
      )}
      footer={
        <span>
          <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </span>
      }
    >
      <form className={cm.cn(cm.stack(5))} onSubmit={handleSubmit}>
        {confirmError && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container border border-error/30',
            )}
          >
            {confirmError.message}
          </div>
        )}
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-email"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderNameCompany',
              {},
              { defaultValue: 'name@company.com' },
            )}
            className={fieldClass}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-token"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          </label>
          <input
            id="reset-token"
            type="text"
            required
            disabled={isSubmitting}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t(
              'resetPassword.tokenPlaceholder',
              {},
              { defaultValue: 'Pasted from your email' },
            )}
            className={fieldClass}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="reset-password"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'tracking-wide text-on-surface',
            )}
          >
            {t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            className={fieldClass}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-transform',
          )}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('resetPassword.submit', {}, { defaultValue: 'Reset password & sign in' })}
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>check</span>
        </button>
      </form>
    </DendriteAuthCard>
  )
}

export default ResetPassword
