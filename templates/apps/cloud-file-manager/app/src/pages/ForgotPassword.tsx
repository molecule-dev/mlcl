import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useAuthClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authClient.requestPasswordReset({ email })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'forgotPassword.failed',
              {},
              { defaultValue: 'Could not send reset email. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AuthShell
        heading={t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
        subheading={t(
          'forgotPassword.successSubheading',
          { email },
          {
            defaultValue:
              'We sent a password reset link to {{email}}. The link is valid for 60 minutes.',
          },
        )}
      >
        <div data-mol-id="forgot-sent">
          <Link
            to="/login"
            data-mol-id="forgot-back-link"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={t(
        'forgotPassword.subheading',
        {},
        { defaultValue: 'Enter your email and we’ll send you a link to choose a new one.' },
      )}
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {error && (
          <div
            role="alert"
            data-mol-id="forgot-error"
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
            htmlFor="email"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 4),
              'bg-surface-container-high rounded-xl py-3',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-outline mr-3')}>mail</span>
            <input
              id="email"
              data-mol-id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
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
          data-mol-id="forgot-submit"
          disabled={loading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 3),
            cm.sp('mt', 2),
            cm.fontWeight('semibold'),
            'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60',
          )}
        >
          {loading
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
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

export default ForgotPassword
