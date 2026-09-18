import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthField } from './Login.js'

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
  const [confirm, setConfirm] = useState('')
  const isPending = confirmStatus === 'pending'
  const passwordMismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await confirmReset({ token, password })
      if (email) await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // error state is tracked inside the confirmReset / login hooks
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 antialiased',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(8))}>
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm', justify: 'center' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold text-foreground tracking-tight')}
          >
            {APP_NAME}
          </span>
        </Link>

        <div className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-xl shadow-blue-500/5')}>
          <div className={cm.stack(2)}>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-foreground')}>
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
              {t(
                'resetPassword.subheading',
                {},
                {
                  defaultValue:
                    'Make it long and unique. We\u2019ll sign you back in automatically.',
                },
              )}
            </p>
          </div>
          <form onSubmit={handleSubmit} className={cm.cn(cm.stack(4), cm.sp('mt', 6))}>
            <AuthField
              label={t('resetPassword.password', {}, { defaultValue: 'New password' })}
              icon="lock"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <AuthField
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              icon="lock"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {passwordMismatch && (
              <p className={cm.cn(cm.textSize('xs'), 'text-error')}>
                {t(
                  'auth.signup.passwordsDontMatchPeriod',
                  {},
                  { defaultValue: "Passwords don't match." },
                )}
              </p>
            )}
            {confirmError && (
              <p
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('xs'),
                  'rounded-lg bg-rose-50 text-error border border-rose-200',
                )}
              >
                {confirmError.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isPending || passwordMismatch}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all',
              )}
            >
              {isPending
                ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
            </button>
          </form>
          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-foreground-secondary mt-6')}>
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-blue-600 hover:underline')}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
export { ResetPassword as ResetPasswordPage }
