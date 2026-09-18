import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuthClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
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
      await authClient.confirmPasswordReset({ token, password })
      setDone(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'resetPassword.failed',
              {},
              { defaultValue: 'Could not reset password. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell
        heading={t('resetPassword.successHeading', {}, { defaultValue: 'Password reset' })}
        subheading={t(
          'resetPassword.successSubheading',
          {},
          { defaultValue: 'You can now sign in with your new password.' },
        )}
      >
        <Link
          to="/login"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
          )}
        >
          {t(
            'resetPassword.signIn',
            { appName: APP_NAME },
            { defaultValue: 'Sign in to {{appName}}' },
          )}
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Choose a strong password — at least 8 characters.' },
      )}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {error && (
          <div
            role="alert"
            data-mol-id="reset-error"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.textCenter,
              cm.fontWeight('medium'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="password"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-high rounded-xl py-3',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-outline mr-3')}>lock</span>
            <input
              id="password"
              data-mol-id="reset-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(
                'resetPassword.passwordPlaceholder',
                {},
                { defaultValue: 'Minimum 8 characters' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-0 focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline',
              )}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="confirm"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-high rounded-xl py-3',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-outline mr-3')}>lock</span>
            <input
              id="confirm"
              data-mol-id="reset-confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t(
                'resetPassword.confirmPlaceholder',
                {},
                { defaultValue: 'Repeat your new password' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('medium'),
                'bg-transparent border-0 focus:ring-0 focus:outline-none text-on-surface placeholder:text-outline',
              )}
            />
          </div>
        </div>

        <button
          type="submit"
          data-mol-id="reset-submit"
          disabled={loading || !token}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.sp('mt', 2),
            cm.fontWeight('semibold'),
            'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <Link
        to="/login"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
          cm.textCenter,
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-primary hover:underline',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      </Link>

      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          cm.sp('mt', 2),
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </AuthShell>
  )
}

export default ResetPassword
