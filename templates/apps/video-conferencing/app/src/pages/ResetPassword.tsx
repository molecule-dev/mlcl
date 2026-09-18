import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { FormField } from './Login.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token] = useState(searchParams.get('token') || '')
  const [emailParam] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const isPending = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await confirmReset({ token, password })
      if (emailParam) {
        await login({ email: emailParam, password })
      }
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // tracked in hook state — confirmError is surfaced via usePasswordReset()
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.grid({ cols: 1 }),
        'lg:grid-cols-2 bg-surface-container-lowest',
      )}
    >
      <AuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
        )}
      >
        <div className={cm.cn(cm.maxW('md'), 'w-full', cm.stack(8))}>
          <header className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('auth.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'auth.resetSubtitle',
                {},
                { defaultValue: 'Choose a strong password to secure your workspace.' },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.stack(4)}>
            <FormField
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <FormField
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'w-full bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-60',
              )}
            >
              {isPending
                ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
            </button>
            {confirmError && (
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded-lg bg-error/10 text-error border border-error/20',
                )}
              >
                {confirmError.message}
              </div>
            )}
          </form>

          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-secondary hover:text-primary transition-colors',
              )}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
