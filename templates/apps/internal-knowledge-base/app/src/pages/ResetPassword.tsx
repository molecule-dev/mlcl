import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthField } from '../components/AuthField.js'
import { CairnAuthBrandPanel } from '../components/CairnAuthBrandPanel.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
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
              'auth.resetPassword.couldNotReset',
              {},
              { defaultValue: 'Could not reset password.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <CairnAuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
          cm.sp('py', 12),
          'w-full lg:w-1/2',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-secondary',
              )}
            >
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
            </h1>
            <p
              className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'italic text-on-surface-variant')}
              style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
            >
              {t(
                'resetPassword.subtitle',
                {},
                { defaultValue: 'Choose a strong password — at least 12 characters.' },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
            <AuthField
              id="password"
              type="password"
              label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
              placeholder={t(
                'resetPassword.passwordPlaceholder',
                {},
                { defaultValue: 'Enter a new password' },
              )}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />
            <AuthField
              id="confirm"
              type="password"
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Repeat the new password' },
              )}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
            />

            {error ? (
              <p
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-error/10 text-error',
                )}
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('extrabold'),
                'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
              )}
            >
              {loading
                ? t('resetPassword.submitting', {}, { defaultValue: 'Resetting\u2026' })
                : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
            </button>
          </form>

          <p className={cm.cn(cm.sp('mt', 8), 'text-center text-sm')}>
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {'\u2190 '}
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
