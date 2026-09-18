import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QuillonAuthBrandPanel } from '../components/QuillonAuthBrandPanel.js'
import { Field } from './Login.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState<string | null>(null)
  const loading = confirmStatus === 'pending'
  const hookErr =
    confirmError instanceof Error
      ? confirmError.message
      : confirmError
        ? String(confirmError)
        : null
  const error = mismatch ?? hookErr

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMismatch(null)
    if (password !== confirm) {
      setMismatch(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    try {
      await confirmReset({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      // hook owns error state — confirmError is already surfaced in the UI
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <QuillonAuthBrandPanel />
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
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'resetPassword.subtitle',
                {},
                { defaultValue: 'Choose a strong password — at least 12 characters.' },
              )}
            </p>
          </header>

          <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
            <Field
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
            <Field
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
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
