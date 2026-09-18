/**
 * ForgotPassword — derived from Login per screen-map.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

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
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear transient state on browser navigation so a prior error doesn't
  // bleed into the next route render.
  useEffect(() => {
    const handler = () => {
      setError(null)
      setSubmitted(false)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/\b\d{3}\b/g, '')
          : t(
              'auth.forgotPassword.couldNotSendResetLink',
              {},
              { defaultValue: 'Could not send reset link.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      pageId="forgot-password"
      heading={
        submitted
          ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
          : t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })
      }
      subhead={
        submitted
          ? t(
              'forgotPassword.successSubhead',
              { email },
              { defaultValue: 'We sent a reset link to {{email}}. It expires in 30 minutes.' },
            )
          : t(
              'forgotPassword.subhead',
              {},
              { defaultValue: 'Enter your email to receive a reset link.' },
            )
      }
      footer={
        <Link
          to="/login"
          data-mol-id="forgot-back-link"
          className="font-bold transition-colors"
          style={{ color: 'var(--color-accent-violet)' }}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      {submitted && (
        <div
          data-mol-id="forgot-sent"
          className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-success-bg)',
            color: 'var(--color-status-success-fg)',
          }}
        >
          {t(
            'forgotPassword.confirmation',
            { email },
            { defaultValue: 'Reset link sent to {{email}}.' },
          )}
        </div>
      )}
      {!submitted && (
        <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              data-mol-id="forgot-error"
              className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-xl')}
              style={{
                background: 'var(--color-status-error-bg)',
                color: 'var(--color-status-error-fg)',
              }}
            >
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest block',
                cm.sp('mb', 1),
              )}
              style={{ color: 'var(--color-status-muted-fg)' }}
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </label>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl',
              )}
              style={{ background: 'var(--mol-color-background)' }}
            >
              <span
                className={'material-symbols-outlined text-xl'}
                style={{ color: 'var(--color-accent-violet-light)' }}
              >
                mail
              </span>
              <input
                id="email"
                data-mol-id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={
                  'flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder:text-foreground-tertiary'
                }
              />
            </div>
          </div>
          <button
            type="submit"
            data-mol-id="forgot-submit"
            disabled={loading}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.textSize('base'),
              cm.fontWeight('bold'),
              cm.sp('mt', 2),
              'rounded-xl text-white shadow-md transition-all active:scale-[0.98]',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-accent-violet), var(--color-accent-violet))',
              boxShadow:
                '0 8px 20px color-mix(in srgb, var(--color-accent-violet) 35%, transparent)',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default ForgotPassword
