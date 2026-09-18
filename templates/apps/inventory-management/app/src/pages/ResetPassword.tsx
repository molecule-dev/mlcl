import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'
import { FormField } from './Login.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const token = params.get('token') ?? ''
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = confirmStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setLocalError(
        t(
          'resetPassword.tooShort',
          {},
          { defaultValue: 'Choose a password with at least 8 characters.' },
        ),
      )
      return
    }
    if (password !== confirm) {
      setLocalError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLocalError(null)
    try {
      await confirmReset({ token, password })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (_error) {
      // surfaced via `confirmError` — the hook exposes the error to the UI
    }
  }

  const submitError = localError ?? confirmError?.message

  return (
    <>
      <AuthShell
        heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
        subheading={
          done
            ? t(
                'resetPassword.subheadingDone',
                {},
                { defaultValue: 'Password updated. Sending you back to sign in…' },
              )
            : t(
                'resetPassword.subheading',
                {},
                {
                  defaultValue:
                    'Choose something memorable but unique. We will sign you in once it is set.',
                },
              )
        }
        bottomLinkText={t('resetPassword.changedMind', {}, { defaultValue: 'Changed your mind?' })}
        bottomLinkLabel={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        bottomLinkTo="/login"
      >
        {done ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('p', 6),
              'rounded-2xl border border-secondary/30 bg-secondary/10 text-center',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-12 w-12 rounded-full bg-secondary text-white',
              )}
            >
              <span className="material-symbols-outlined" data-icon="check">
                check
              </span>
            </span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {t('auth.resetPassword.passwordUpdated', {}, { defaultValue: 'Password updated.' })}
            </p>
            <Link
              to="/login"
              className={cm.cn(
                'text-xs font-bold uppercase tracking-wider text-primary hover:underline',
              )}
            >
              {t('resetPassword.signInNow', {}, { defaultValue: 'Sign in now' })}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
            <FormField
              label={t('resetPassword.newPassword', {}, { defaultValue: 'New password' })}
              icon="lock"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t(
                'common.atLeast8Characters',
                {},
                { defaultValue: 'At least 8 characters' },
              )}
              autoComplete="new-password"
              required
            />
            <FormField
              label={t(
                'auth.signup.confirmNewPassword',
                {},
                { defaultValue: 'Confirm new password' },
              )}
              icon="check_circle"
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            {submitError && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-lg bg-error-container text-on-error-container border border-error/20',
                )}
              >
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className={cm.cn(
                cm.w('full'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.h(12),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
              )}
            >
              {isSubmitting
                ? t('resetPassword.submitting', {}, { defaultValue: 'Updating password…' })
                : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                data-icon="lock_reset"
              >
                lock_reset
              </span>
            </button>
            {!token && (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
                {t(
                  'resetPassword.missingToken',
                  {},
                  { defaultValue: 'Open the reset link from your email to continue.' },
                )}
              </p>
            )}
          </form>
        )}

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
          {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
          <button
            type="button"
            onClick={openTerms}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </button>{' '}
          {t('common.and', {}, { defaultValue: 'and' })}{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </button>
        </p>
      </AuthShell>
      {modals}
    </>
  )
}

export default ResetPassword
