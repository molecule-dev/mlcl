// Phase 1 — derived copy from Login (same stitch: design-property-listing-login.html).
// Phase 4 wires it to this screen's own auth flow.
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ForgotPassword() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.errorSendFailed', {}, { defaultValue: 'Could not send reset email' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-background font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('lg'))}>
        {/* Auth Card */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
            cm.w('full'),
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-xl luxury-shadow md:p-14',
          )}
        >
          {/* Logo */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('mb', 2),
                'bg-primary rounded-lg rotate-3',
              )}
            >
              <span
                className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined text-on-primary')}
                data-icon="domain"
              >
                domain
              </span>
            </div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tighter text-primary',
              )}
            >
              {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h2>
          </div>
          {/* Header */}
          <div className={cm.cn(cm.textCenter)}>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.sp('mb', 3),
                cm.fontWeight('bold'),
                'font-headline tracking-tight text-on-surface',
              )}
            >
              {t('forgotPassword.title', {}, { defaultValue: 'Forgot Password?' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                {
                  defaultValue:
                    "Enter your email address and we'll send you a link to reset your password.",
                },
              )}
            </p>
          </div>
          {/* Success */}
          {sent && (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.textCenter,
                cm.textSize('sm'),
                cm.w('full'),
                'bg-primary-container text-on-primary-container rounded-xl',
              )}
            >
              {t(
                'forgotPassword.successMessage',
                {},
                { defaultValue: 'Check your email for the reset link.' },
              )}
            </div>
          )}
          {/* Error */}
          {error && (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.textCenter,
                cm.textSize('sm'),
                cm.w('full'),
                'bg-error-container text-on-error-container rounded-xl',
              )}
            >
              {error}
            </div>
          )}
          {/* Forgot Password Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
            <div className={cm.stack(2)}>
              <label
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('ml', 4),
                  cm.fontWeight('semibold'),
                  'block font-label text-on-surface-variant',
                )}
              >
                {t('common.emailAddress', {}, { defaultValue: 'Email Address' })}
              </label>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'ghost-border bg-surface-container-low rounded-xl transition-all',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-outline')}
                  data-icon="alternate_email"
                >
                  alternate_email
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline-variant',
                  )}
                  placeholder={t(
                    'forgotPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'name@luxury.com' },
                  )}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={sent}
                />
              </div>
            </div>

            <button
              className={cm.cn(
                cm.w('full'),
                cm.h(16),
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all',
              )}
              type="submit"
              disabled={loading || sent}
            >
              {loading ? (
                <span
                  className={cm.cn('material-symbols-outlined animate-spin')}
                  data-icon="progress_activity"
                >
                  progress_activity
                </span>
              ) : (
                <>
                  {t('forgotPassword.sendResetLink', {}, { defaultValue: 'Send Reset Link' })}
                  <span className={cm.cn('material-symbols-outlined')} data-icon="arrow_forward">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className={cm.cn(cm.textCenter)}>
            <p className={cm.cn('text-on-surface-variant')}>
              {t('forgotPassword.noAccountPrompt', {}, { defaultValue: "Don't have an account? " })}

              <Link className={cm.cn('text-primary font-bold ml-1 hover:underline')} to="/signup">
                {t('common.signUp', {}, { defaultValue: 'Sign Up' })}
              </Link>
            </p>
          </div>
        </div>
        {/* Decorative Surface Decoration (Tonal Layering) */}
        <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.sp('px', 10))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-outline tracking-widest uppercase opacity-40',
            )}
          >
            {t(
              'common.copyright',
              { year: 2024, appName: APP_NAME },
              { defaultValue: '{{appName}} © {{year}}' },
            )}
          </p>
        </div>
      </main>
      {/* Background Decoration */}
      <div className={cm.cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none')}>
        <div
          className={cm.cn(
            'w-[40%]',
            'h-[40%]',
            cm.roundedFull,
            'absolute top-[-10%] right-[-10%] bg-primary/5 blur-[120px]',
          )}
        ></div>
        <div
          className={cm.cn(
            'w-[40%]',
            'h-[40%]',
            cm.roundedFull,
            'absolute bottom-[-10%] left-[-10%] bg-secondary/5 blur-[120px]',
          )}
        ></div>
      </div>
      {/* Mandatory Footer component from JSON structure (Suppressing for focused Login flow as per rules) */}
      {/* The "Relevance Check" logic hides the global footer for transactional login screens to prioritize focus. */}
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
