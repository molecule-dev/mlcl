import { useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgot.failed', {}, { defaultValue: 'Could not send reset email.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={
        sent
          ? t('forgot.sentSubheading', {}, { defaultValue: 'Check your inbox for the reset link.' })
          : t(
              'forgot.subheading',
              {},
              { defaultValue: 'Enter your email and we will send a reset link.' },
            )
      }
      altPrompt={t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}
      altLinkText={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
      altLinkTo="/login"
    >
      {sent ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.sp('py', 6),
            cm.textCenter,
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-14 w-14 bg-success-container text-on-success-container',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
          </span>
          <p className={cm.cn(cm.textSize('sm'))}>
            {t(
              'forgot.sentBody',
              { email },
              {
                defaultValue:
                  'If an account exists for {{email}}, you will get a reset link shortly.',
              },
            )}
          </p>
        </div>
      ) : (
        <form className={cm.cn(cm.stack(5))} onSubmit={handleSubmit}>
          <label className={cm.cn(cm.stack(1))} htmlFor="forgot-email">
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('ml', 1))}>
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </span>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderNameCompany',
                {},
                { defaultValue: 'name@company.com' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.textSize('base'),
                'h-12 bg-surface-container-high border-0 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
              )}
            />
          </label>

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
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
