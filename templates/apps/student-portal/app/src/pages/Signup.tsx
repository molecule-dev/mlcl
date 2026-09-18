import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, firstName, lastName) are shared across the auth
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
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const legalLinkClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined
      await signup({ email, password, name: fullName })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // hook exposes the error via its own state; no action needed here
    }
  }

  return (
    <div
      data-mol-id="page-signup"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-low font-body text-on-surface',
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-primary/10',
            )}
          >
            <AuthBrandHeader />

            <div>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.textCenter, 'font-extrabold tracking-tight')}
              >
                {t('signup.heading', {}, { defaultValue: 'Create your portal' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.textCenter,
                  cm.sp('mt', 1),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'signup.subheading',
                  {},
                  { defaultValue: 'Free for 30 days. No credit card required.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')} onSubmit={handleSubmit}>
              <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }))}>
                <FieldShell
                  cm={cm}
                  id="signup-first"
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  icon="badge"
                >
                  <input
                    id="signup-first"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Riley"
                    className={inputClass(cm)}
                  />
                </FieldShell>
                <FieldShell
                  cm={cm}
                  id="signup-last"
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  icon="badge"
                >
                  <input
                    id="signup-last"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Carter"
                    className={inputClass(cm)}
                  />
                </FieldShell>
              </div>

              <FieldShell
                cm={cm}
                id="signup-email"
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                icon="mail"
              >
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="riley@school.edu"
                  className={inputClass(cm)}
                />
              </FieldShell>

              <FieldShell
                cm={cm}
                id="signup-password"
                label={t('auth.login.password', {}, { defaultValue: 'Password' })}
                icon="lock"
              >
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass(cm)}
                />
              </FieldShell>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-xl',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'bg-gradient-to-r from-primary to-primary/80 text-on-primary hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-60',
                )}
              >
                {isSigningUp
                  ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </form>

            <OAuthButtons />
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
                className={cm.cn(
                  'font-bold text-primary hover:underline decoration-2 underline-offset-4 ml-1',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
            {/* Privacy/Terms open IN-PLACE modals instead of navigating away — the
                standalone /privacy and /terms routes still exist for deep links. */}
            <nav
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.sp('mt', 3),
              )}
            >
              <LegalModalLinks
                linkClassName={legalLinkClass}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
            </nav>
          </footer>
        </div>
      </main>
    </div>
  )
}

function inputClass(cm: ReturnType<typeof getClassMap>): string {
  return cm.cn(
    cm.w('full'),
    cm.sp('p', 0),
    cm.fontWeight('medium'),
    'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant focus:outline-none',
  )
}

function FieldShell({
  cm,
  id,
  label,
  icon,
  children,
}: {
  cm: ReturnType<typeof getClassMap>
  id: string
  label: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'relative bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline-variant focus-within:border-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-primary',
          )}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  )
}
