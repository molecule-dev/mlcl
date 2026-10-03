import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recoverySteps = [
    {
      key: 'forgotPassword.recovery.expiration.title',
      def: 'Instant 15-Minute Link Expiration',
      bodyKey: 'forgotPassword.recovery.expiration.body',
      bodyDef:
        'Reset links expire in fifteen minutes so a hijacked unmonitored tablet session or an emailed link sitting in a trailer inbox cannot be replayed later.',
    },
    {
      key: 'forgotPassword.recovery.sso.title',
      def: 'Hardware Token / SAML Bypass',
      bodyKey: 'forgotPassword.recovery.sso.body',
      bodyDef:
        'If your company signs in through a federated identity provider, skip the password entirely — continue with the enterprise SSO button on the sign-in view.',
    },
    {
      key: 'forgotPassword.recovery.offline.title',
      def: 'Sub-basement Offline Override',
      bodyKey: 'forgotPassword.recovery.offline.body',
      bodyDef:
        'A device that already holds an unlocked offline cache keeps recording field work below grade; the reset takes effect the next time it reaches the trailer network.',
    },
    {
      key: 'forgotPassword.recovery.workstation.title',
      def: 'Trailer Workstation Support',
      bodyKey: 'forgotPassword.recovery.workstation.body',
      bodyDef:
        'Shared trailer terminals stay signed in under the site-admin account, so a foreman locked out of their own login can keep filing logs while the reset email lands.',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email: email.trim() })
      setSubmitted(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.error', {}, { defaultValue: 'Failed to send reset link.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        cm.sp('py', 16),
        cm.minH('screen'),
        'bg-background text-on-background selection:bg-primary-fixed selection:text-primary',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'max-w-[1080px] w-full mx-auto',
        )}
      >
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-2 w-full items-start')}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('p', 16),
              'bg-surface w-full rounded-2xl custom-shadow',
            )}
          >
            <div className={cm.cn(cm.sp('mb', 12), cm.textCenter)}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.sp('mb', 4),
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    'brand-gradient rounded-xl text-on-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    data-icon="construction"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    construction
                  </span>
                </div>
                <Link
                  className={cm.cn('text-3xl font-black tracking-tighter text-on-background')}
                  to="/"
                >
                  {t('common.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
                </Link>
              </div>
              <h1
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'tracking-tight text-on-background',
                )}
              >
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'forgotPassword.subtitle',
                  {},
                  { defaultValue: "Enter your email and we'll send you a reset link." },
                )}
              </p>
            </div>

            {submitted ? (
              <div
                role="status"
                data-testid="forgot-password-sent"
                className={cm.cn(
                  'w-full p-6 rounded-xl bg-success-light text-success text-sm text-center',
                )}
              >
                {t(
                  'forgotPassword.sent',
                  { email },
                  {
                    defaultValue:
                      'If an account exists for {{email}}, a reset link has been sent. Check your inbox.',
                  },
                )}
              </div>
            ) : (
              <form className={cm.cn(cm.stack(6), 'w-full')} onSubmit={handleSubmit}>
                {error && (
                  <div
                    role="alert"
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'bg-error-light text-error rounded-lg',
                    )}
                  >
                    {error}
                  </div>
                )}
                <div className={cm.cn(cm.stack(2))}>
                  <label
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.sp('ml', 1),
                      'block tracking-wide text-on-background',
                    )}
                    htmlFor="email"
                  >
                    {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'w-full bg-surface-container-low focus:bg-surface border-0 ghost-border rounded-xl text-on-background placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 transition-all duration-300 outline-none',
                    )}
                    id="email"
                    placeholder={t(
                      'auth.passwordPlaceholderNameCompany',
                      {},
                      { defaultValue: 'name@company.com' },
                    )}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <button
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                    cm.fontWeight('bold'),
                    cm.sp('py', 4),
                    cm.sp('mt', 2),
                    'w-full brand-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50',
                  )}
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                  <span
                    className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                    data-icon="arrow_forward"
                  >
                    arrow_forward
                  </span>
                </button>
              </form>
            )}

            <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
              <Link
                className={cm.cn(
                  'text-primary font-bold hover:underline underline-offset-4 text-sm',
                )}
                to="/login"
              >
                {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
              </Link>
            </div>
          </div>

          {/* Field Recovery Protocol panel (the design's side rail) */}
          <aside
            data-mol-id="forgot-password-recovery"
            aria-label={t(
              'forgotPassword.recovery.label',
              {},
              { defaultValue: 'Field Recovery Protocol' },
            )}
            className="space-y-5 w-full"
          >
            <div className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface custom-shadow space-y-5')}>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-container text-on-primary-container shrink-0"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    restore
                  </span>
                </span>
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'forgotPassword.recovery.overline',
                      {},
                      { defaultValue: 'Reset Jobsite Access' },
                    )}
                  </p>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
                    {t(
                      'forgotPassword.recovery.title',
                      {},
                      { defaultValue: 'Field Recovery Protocol' },
                    )}
                  </h2>
                </div>
              </div>
              <ol className="space-y-4">
                {recoverySteps.map((step, idx) => (
                  <li key={step.key} className={cm.flex({ gap: 'md', align: 'start' })}>
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-container text-on-surface',
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {t(step.key, {}, { defaultValue: step.def })}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(step.bodyKey, {}, { defaultValue: step.bodyDef })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Locked-out help card */}
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-inverse-surface text-inverse-on-surface space-y-2',
              )}
            >
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t(
                  'forgotPassword.lockout.title',
                  {},
                  { defaultValue: 'Trailer Lockout or Offline on Site?' },
                )}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-inverse-on-surface')}>
                {t(
                  'forgotPassword.lockout.body',
                  {},
                  {
                    defaultValue:
                      'Locked out on the job trailer or offline at the foundation pour? Contact your Jobsite Admin (site ext. 402) or call Emergency Field Support at 1-800-555-GRND — the dispatch desk answers around the clock.',
                  },
                )}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
