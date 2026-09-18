import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { authClient } from '../bonds/index.js'
import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

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
          : t('forgot.errorGeneric', {}, { defaultValue: 'Could not send reset link. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
      subheading={
        submitted
          ? t(
              'forgot.subheadingSubmitted',
              {},
              { defaultValue: "We'll email you a link if the account exists." },
            )
          : t(
              'forgot.subheading',
              {},
              { defaultValue: "Enter your email and we'll send you a reset link." },
            )
      }
      footer={
        <>
          <span className={cm.cn('text-on-surface-variant')}>
            {t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}
          </span>{' '}
          <Link
            to="/login"
            className={
              'text-primary hover:text-primary-container hover:underline decoration-2 underline-offset-4 transition-all'
            }
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
          {/* Privacy/Terms open IN-PLACE modals instead of navigating away — the
              standalone /privacy and /terms routes still exist for deep links. */}
          <div className={cm.cn('mt-4 flex items-center justify-center gap-4 text-xs')}>
            <LegalModalLinks
              linkClassName={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </>
      }
    >
      {submitted ? (
        <div className={cm.cn('space-y-6 text-center')} data-mol-id="forgot-success">
          <div
            className={cm.cn(
              'mx-auto w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-3xl text-on-secondary-container')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              mark_email_read
            </span>
          </div>
          <p className={cm.cn('text-on-surface-variant text-sm leading-relaxed')}>
            {t(
              'forgot.successBody',
              { email },
              {
                defaultValue:
                  'If an account exists for {{email}}, a reset link is on its way. Check your inbox and spam folder.',
              },
            )}
          </p>
          <Link
            to="/login"
            className={cm.cn(
              'inline-block py-3 px-6 bg-primary-container text-on-primary font-bold rounded-xl hover:bg-primary transition-all',
            )}
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </div>
      ) : (
        <form className={cm.cn('space-y-5')} onSubmit={handleSubmit}>
          {error && (
            <div
              role="alert"
              data-mol-id="forgot-error"
              className={cm.cn(
                'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm',
              )}
            >
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className={cm.cn(
                'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <div className={cm.cn('relative')}>
              <span
                className={cm.cn(
                  'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                mail
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@institution.edu"
                className={
                  'w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
                }
              />
            </div>
          </div>
          <button
            type="submit"
            data-mol-id="btn-send-reset"
            disabled={loading}
            className={cm.cn(
              'w-full py-3.5 px-4 bg-primary-container text-on-primary font-bold rounded-xl shadow-[0px_8px_24px_rgba(99,54,224,0.25)] hover:bg-primary hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70',
            )}
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
