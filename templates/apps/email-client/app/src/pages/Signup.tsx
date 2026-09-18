import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MeridianBrandHeader } from '../components/MeridianBrandHeader.js'

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
  const [showPassword, setShowPassword] = useState(false)
  const isSubmitting = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ name, email, password })
      clearAuthForm()
      navigate('/inbox', { replace: true })
    } catch (_error) {
      // Error tracked in hook state.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-gradient-to-br from-primary/5 via-surface to-secondary/5 text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'lg' }),
              cm.sp('p', 10),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-2xl shadow-primary/10',
            )}
          >
            <MeridianBrandHeader />

            <header className={cm.cn(cm.textCenter, cm.flex({ direction: 'col', gap: 'xs' }))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t(
                  'meridian.signup.heading',
                  { appName: APP_NAME },
                  { defaultValue: 'Create your {{appName}} inbox' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'meridian.signup.subtitle',
                  {},
                  { defaultValue: 'Process your inbox before lunch.' },
                )}
              </p>
            </header>

            <form
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              onSubmit={handleSubmit}
            >
              {/* Name */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="name"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.signup.name', {}, { defaultValue: 'Your name' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'h-12 rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 2),
                      'material-symbols-outlined text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    person
                  </span>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(
                      'meridian.signup.namePlaceholder',
                      {},
                      { defaultValue: 'Morgan Chen' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 text-on-surface',
                    )}
                  />
                </div>
              </div>

              {/* Email */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="email"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'h-12 rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 2),
                      'material-symbols-outlined text-on-surface-variant',
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
                      'meridian.signup.emailPlaceholder',
                      {},
                      { defaultValue: 'morgan@company.com' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 text-on-surface',
                    )}
                  />
                </div>
              </div>

              {/* Password */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor="password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'h-12 rounded-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 2),
                      'material-symbols-outlined text-on-surface-variant',
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
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(
                      'common.atLeast8Characters',
                      {},
                      { defaultValue: 'At least 8 characters' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant/60 text-on-surface',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? t('meridian.signup.hidePassword', {}, { defaultValue: 'Hide password' })
                        : t('meridian.signup.showPassword', {}, { defaultValue: 'Show password' })
                    }
                    className={cm.cn(
                      cm.sp('ml', 2),
                      'text-on-surface-variant hover:text-primary transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-xl bg-error-light text-error',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('base'),
                  cm.sp('mt', 2),
                  'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-60',
                )}
              >
                {isSubmitting
                  ? t(
                      'common.creatingYourAccountEllipsis',
                      {},
                      { defaultValue: 'Creating your account…' },
                    )
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </form>
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
                className={'font-bold text-primary hover:underline decoration-2 underline-offset-4'}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Signup
