import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { DemoTripCard } from '../components/DemoTripCard.js'
import { Footer } from '../components/Footer.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // surfaced via requestError — hook state tracks this, ignoring here is correct
    }
  }

  return (
    <div
      data-mol-id="page-forgot-password"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface rounded-3xl shadow-xl shadow-primary/5 border border-outline-variant/40',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.textCenter}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant max-w-sm mx-auto',
                )}
              >
                {submitted
                  ? t(
                      'forgotPassword.successBody',
                      { email },
                      {
                        defaultValue:
                          "If an account exists for {{email}} you'll receive a reset link in the next few minutes.",
                      },
                    )
                  : t(
                      'forgotPassword.subheading',
                      {},
                      {
                        defaultValue:
                          "Enter your work email and we'll send a link to set a new password.",
                      },
                    )}
              </p>
            </div>

            {!submitted ? (
              <form
                className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
                onSubmit={handleSubmit}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <label
                    htmlFor="email"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                  </label>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      'bg-surface-container-low rounded-xl py-3 focus-within:ring-2 focus-within:ring-primary/30',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-xl text-on-surface-variant mr-2',
                      )}
                      aria-hidden="true"
                    >
                      mail
                    </span>
                    <input
                      id="email"
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
                        cm.fontWeight('medium'),
                        'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
                      )}
                    />
                  </div>
                </div>

                {requestError ? (
                  <div
                    role="alert"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'rounded-xl bg-error-container text-on-error-container',
                    )}
                  >
                    {requestError.message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.sp('mt', 2),
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'rounded-full text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-60',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                  }}
                >
                  {isSubmitting
                    ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-full text-white shadow-lg shadow-primary/20 transition-all',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                }}
              >
                {t('forgotPassword.continue', {}, { defaultValue: 'I have a code · Continue' })}
              </button>
            )}

            {/* Stitch demo panel + security checklist. */}
            <DemoTripCard
              emoji="🌲"
              name={t('forgotPassword.demoTrip', {}, { defaultValue: 'Portland Cabin Trip' })}
              meta={t('forgotPassword.demoTripMeta', {}, { defaultValue: '7 members · Labor Day' })}
              badge={t('forgotPassword.demoTripBadge', {}, { defaultValue: 'Protected & Synced' })}
              balanceLabel={t(
                'forgotPassword.demoBalanceLabel',
                {},
                { defaultValue: 'Your Pending Net Balance' },
              )}
              balance="+$210.00"
              avatars={['SM', 'DP', 'EK']}
            />

            <section
              data-mol-id="forgot-password-security"
              className={cm.cn(cm.stack(2))}
              aria-label={t(
                'forgotPassword.securityTitle',
                { app: 'Evenly' },
                { defaultValue: 'How {{app}} protects your account' },
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 2 }),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-7 w-7 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>security</span>
                </span>
                {t(
                  'forgotPassword.securityTitle',
                  { app: 'Evenly' },
                  { defaultValue: 'How {{app}} protects your account' },
                )}
              </h3>
              <ul className={cm.stack(2)}>
                {(
                  [
                    {
                      icon: 'timer',
                      title: '15-minute expiration:',
                      body: ' Reset links automatically invalidate so a stray email can’t touch your shared ledgers.',
                    },
                    {
                      icon: 'pause_circle',
                      title: 'Automatic transfer pause:',
                      body: ' Outward settlement links stay locked until your identity is confirmed again.',
                    },
                    {
                      icon: 'support_agent',
                      title: '24/7 organizer hotline:',
                      body: ' Locked out mid-trip? Priority assistance is standing by.',
                    },
                  ] as const
                ).map((row) => (
                  <li key={row.title} className={cm.flex({ align: 'start', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                      aria-hidden="true"
                    >
                      {row.icon}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      <strong className={cm.fontWeight('semibold') + ' text-on-surface'}>
                        {t(`forgotPassword.security.${row.title}`, {}, { defaultValue: row.title })}
                      </strong>
                      {t(
                        `forgotPassword.securityBody.${row.title}`,
                        {},
                        { defaultValue: row.body },
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_back
              </span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
