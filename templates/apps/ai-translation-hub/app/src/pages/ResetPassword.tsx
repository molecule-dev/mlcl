import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token] = useState(searchParams.get('token') || '')
  const [email] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')

  const isSubmitting = confirmStatus === 'pending'

  const [missingToken, setMissingToken] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setMissingToken(true)
      return
    }
    try {
      await confirmReset({ token, password })
      if (email) {
        await login({ email, password })
      }
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (resetError is surfaced in the UI)
    }
  }

  return (
    <AuthShell>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 10),
          'rounded-[1.5rem] bg-surface-container-lowest border border-surface-container/50 shadow-2xl shadow-primary/10',
        )}
      >
        <AuthBrandHeader />
        <div className={cm.textCenter}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tracking-tight')}>
            {t(
              'auth.resetPassword.chooseNewPassword',
              {},
              { defaultValue: 'Choose a new password' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'reset.subtitle',
              {},
              { defaultValue: 'Make it long, unique, and easy for you to remember.' },
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            <label
              htmlFor="password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('reset.passwordLabel', {}, { defaultValue: 'New password' })}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'common.atLeast12Characters',
                {},
                { defaultValue: 'At least 12 characters' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'h-12 bg-transparent border-0 border-b-2 border-surface-dim focus:border-primary focus:ring-0 focus:outline-none px-0 py-2 text-base placeholder:text-outline-variant transition-colors duration-300',
              )}
            />
          </div>

          {confirmError && (
            <div
              role="alert"
              data-mol-id="reset-error"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                cm.textCenter,
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {confirmError.message}
            </div>
          )}

          {missingToken && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                cm.textCenter,
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {t(
                'reset.missingToken',
                {},
                {
                  defaultValue:
                    'This password reset link is missing or expired. Please request a new one.',
                },
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'w-full rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-all shadow-md shadow-primary/30 disabled:opacity-60',
            )}
          >
            {isSubmitting
              ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
              : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
          </button>
        </form>

        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('reset.backToLogin', {}, { defaultValue: '\u2190 Back to sign in' })}
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default ResetPassword
export { ResetPassword as ResetPasswordPage }
