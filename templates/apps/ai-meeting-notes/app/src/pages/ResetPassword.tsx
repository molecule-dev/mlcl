import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError(
        t(
          'reset.missingToken',
          {},
          { defaultValue: 'Reset link is missing or expired. Request a new one.' },
        ),
      )
      return
    }
    if (password.length < 8) {
      setError(t('reset.tooShort', {}, { defaultValue: 'Password must be at least 8 characters.' }))
      return
    }
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setSubmitting(true)
    try {
      await http.post('/api/users/reset-password', { token, password })
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
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'reset.subheading',
        {},
        { defaultValue: 'Choose a password you don’t use anywhere else.' },
      )}
      altPrompt={t('reset.altPrompt', {}, { defaultValue: 'Changed your mind?' })}
      altLinkText={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      altLinkTo="/login"
    >
      <form className={cm.cn(cm.stack(4))} onSubmit={handleSubmit}>
        <label className={cm.cn(cm.stack(1))} htmlFor="reset-new">
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('ml', 1))}>
            {t('reset.newPassword', {}, { defaultValue: 'New password' })}
          </span>
          <input
            id="reset-new"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.textSize('base'),
              'h-12 bg-surface-container-high border-0 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
            )}
          />
        </label>

        <label className={cm.cn(cm.stack(1))} htmlFor="reset-confirm">
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('ml', 1))}>
            {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          </span>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.textSize('base'),
              'h-12 bg-surface-container-high border-0 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
            )}
          />
        </label>

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('ml', 1))}>
          {t(
            'reset.hint',
            {},
            { defaultValue: 'Use at least 8 characters with a mix of letters and numbers.' },
          )}
        </p>

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('base'),
            'h-12 rounded-xl text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-lg hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60',
          )}
        >
          {submitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </AuthShell>
  )
}
