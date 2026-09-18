import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ClarionAuthShell } from '../components/ClarionAuthShell.js'

function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('forgotPassword.emailRequired', {}, { defaultValue: 'Email is required' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.sendError', {}, { defaultValue: 'Could not send reset email' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClarionAuthShell
      heading={
        sent
          ? t('forgotPassword.sentHeading', {}, { defaultValue: 'Check your email' })
          : t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })
      }
      subheading={
        sent
          ? t(
              'forgotPassword.sentSubheading',
              { email },
              {
                defaultValue: 'We sent a reset link to {{email}}. The link expires in 30 minutes.',
              },
            )
          : t(
              'forgotPassword.subheading',
              {},
              {
                defaultValue:
                  'Enter your work email and we’ll send you a link to set a new password.',
              },
            )
      }
      footer={
        <>
          {t('forgotPassword.backPrompt', {}, { defaultValue: 'Remember it after all? ' })}
          <Link
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:text-primary-container transition-colors',
            )}
            to="/login"
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </>
      }
    >
      {sent ? (
        <div
          data-mol-id="forgot-sent"
          className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 4 }), cm.sp('py', 4))}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              cm.roundedFull,
              'bg-success/15 text-success',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('2xl'))}
              aria-hidden="true"
            >
              mark_email_read
            </span>
          </span>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant text-center max-w-sm leading-relaxed',
            )}
          >
            {t(
              'forgotPassword.checkSpam',
              {},
              {
                defaultValue:
                  'If you don’t see it within a minute, check your spam folder or try resending.',
              },
            )}
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:text-primary-container transition-colors',
            )}
          >
            {t('forgotPassword.resend', {}, { defaultValue: 'Send again' })}
          </button>
        </div>
      ) : (
        <form className={cm.stack(5)} onSubmit={handleSubmit}>
          <div>
            <label className={'sr-only'} htmlFor="email">
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <div className={'relative'}>
              <span
                className={cm.cn(
                  'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none material-symbols-outlined text-on-surface-variant/60',
                  cm.textSize('sm'),
                )}
                aria-hidden="true"
              >
                mail
              </span>
              <input
                autoComplete="email"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 10),
                  cm.sp('pr', 3),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'block bg-surface-container-high border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:outline-none transition-all',
                )}
                id="email"
                name="email"
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder={t(
                  'auth.passwordPlaceholderCompanyEmail',
                  {},
                  { defaultValue: 'you@company.com' },
                )}
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm',
            )}
          >
            {loading ? (
              <>
                <span
                  className={cm.cn('material-symbols-outlined animate-spin', cm.textSize('base'))}
                  aria-hidden="true"
                >
                  progress_activity
                </span>
                {t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })}
              </>
            ) : (
              <>
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                  aria-hidden="true"
                >
                  send
                </span>
                {t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              </>
            )}
          </button>
        </form>
      )}
    </ClarionAuthShell>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
