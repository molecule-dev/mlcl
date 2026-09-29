import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { DemoTripCard } from '../components/DemoTripCard.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — ignoring here is correct
    }
  }

  return (
    <div
      data-mol-id="page-signup"
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
                {t(
                  'signup.heading',
                  { appName: APP_NAME },
                  { defaultValue: 'Create your {{appName}} account' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'signup.subheading',
                  {},
                  { defaultValue: 'Free for 25 expenses each month — no credit card.' },
                )}
              </p>
            </div>

            <form
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              onSubmit={handleSubmit}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="name"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.fullName', {}, { defaultValue: 'Full name' })}
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
                    person
                  </span>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Maya Okafor' })}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                </div>
              </div>

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

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
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
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(
                      'common.atLeast8Characters',
                      {},
                      { defaultValue: 'At least 8 characters' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('signup.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn(
                      'text-on-surface-variant hover:text-primary transition-colors ml-2',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
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
                  {t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
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
                    lock_reset
                  </span>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant',
                    )}
                  />
                </div>
                {confirm && confirm !== password ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-[var(--color-status-rejected)]',
                    )}
                  >
                    {t(
                      'auth.signup.passwordsDoNotMatchPeriod',
                      {},
                      { defaultValue: 'Passwords do not match.' },
                    )}
                  </p>
                ) : null}
              </div>

              {error ? (
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
                  {error.message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSigningUp || password !== confirm}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'rounded-full text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                }}
              >
                {isSigningUp
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </form>

            <OAuthButtons />

            {/* Stitch demo panel — the sample trip a new account is seeded into. */}
            <DemoTripCard
              emoji="🧗"
              name={t('signup.demoTrip', {}, { defaultValue: 'Trip to Joshua Tree' })}
              meta={t('signup.demoTripMeta', {}, { defaultValue: '4 friends · Weekend getaway' })}
              badge={t('signup.demoTripBadge', {}, { defaultValue: '3 of 4 settled' })}
              balanceLabel={t('signup.demoBalanceLabel', {}, { defaultValue: 'Your net balance' })}
              balance="+$142.50"
              balanceNote={t(
                'signup.demoBalanceNote',
                {},
                { defaultValue: "You're owed across 2 transfers" },
              )}
              avatars={['ML', 'SV', 'DK', 'JL']}
            />
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline ml-1')}
                style={{ color: 'var(--color-primary-hover)' }}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
