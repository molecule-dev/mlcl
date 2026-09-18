import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ForgotPasswordMainContent() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Reset the submission-success view whenever this route is re-entered (or
  // popstate fires) so subsequent visits land on the form again — otherwise
  // the "check your email" view sticks across SPA navigations and changes
  // the visible interactive elements.
  const location = useLocation()
  useEffect(() => {
    setSent(false)
  }, [location.key])
  useEffect(() => {
    const onPop = () => setSent(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Read the live email field directly so programmatic submits (without
    // React state being in sync — e.g. test harnesses that set `input.value`
    // and dispatch an event) still see the user-entered value.
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const submittedEmail = String(formData.get('email') ?? email).trim()
    if (!submittedEmail) {
      setError(t('forgotPassword.emailRequired', {}, { defaultValue: 'Please enter your email' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email: submittedEmail })
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
    <main
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('pb', 12),
        cm.sp('px', 6),
        cm.flex1,
        'pt-24',
      )}
    >
      <div
        className={cm.cn(
          cm.w('full'),
          'max-w-[440px]',
          'animate-in fade-in slide-in-from-bottom-4 duration-700',
        )}
      >
        <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
          <h1
            className={cm.cn(
              cm.sp('mb', 2),
              'font-headline text-[2.5rem] leading-tight tracking-tight text-on-surface',
            )}
          >
            {sent
              ? t('forgotPassword.sentTitle', {}, { defaultValue: 'Check your email' })
              : t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'font-sans-ui text-on-surface-variant tracking-wide',
            )}
          >
            {sent
              ? t(
                  'forgotPassword.sentSubtitle',
                  {},
                  { defaultValue: 'We sent a reset link to your inbox.' },
                )
              : t(
                  'forgotPassword.subtitle',
                  {},
                  { defaultValue: "Enter your email and we'll send you a reset link." },
                )}
          </p>
        </div>
        {sent ? (
          <div role="status" aria-live="polite" className={cm.cn(cm.textCenter, cm.stack(4))}>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setEmail('')
                setError(null)
              }}
              className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'font-sans-ui hover:underline')}
            >
              {t(
                'forgotPassword.tryDifferent',
                {},
                { defaultValue: "Didn't get it? Try a different email" },
              )}
            </button>
            <div>
              <Link to="/login" className={cm.fvc3b0074f}>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </div>
          </div>
        ) : (
          <form className={cm.stack(6)} onSubmit={onSubmit}>
            <div className={cm.cn('space-y-1.5')}>
              <label
                htmlFor="forgot-email"
                className={cm.cn(
                  cm.sp('ml', 1),
                  'font-sans-ui text-[0.7rem] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="forgot-email"
                name="email"
                data-mol-id="input-forgot-email"
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.textSize('base'),
                  cm.w('full'),
                  'bg-transparent border-0 border-b border-outline-variant/30 focus:ring-0 focus:border-primary transition-all font-sans-ui placeholder:text-outline/50',
                )}
                placeholder={t(
                  'auth.passwordPlaceholderNameExample',
                  {},
                  { defaultValue: 'name@example.com' },
                )}
                type="email"
                required
                aria-invalid={!!error}
                aria-describedby={error ? 'forgot-error' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p
                id="forgot-error"
                role="alert"
                aria-live="polite"
                className={cm.cn(cm.textSize('xs'), 'font-sans-ui text-error')}
              >
                {error}
              </p>
            )}
            <div className={cm.sp('pt', 4)}>
              <button
                data-mol-id="button-forgot-submit"
                className={cm.cn(
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.w('full'),
                  'h-[48px]',
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary font-sans-ui tracking-wide shadow-lg shadow-primary/10 transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
                )}
                disabled={loading}
                type="submit"
              >
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              </button>
            </div>
            <p className={cm.cn(cm.textCenter, cm.sp('pt', 2))}>
              <Link to="/login" className={cm.fvc3b0074f}>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
