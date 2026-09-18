import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

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
  const [confirmPassword, setConfirmPassword] = useState('')

  const isPending = status === 'pending'
  const passwordsMatch = password.length === 0 || password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await signup({ email, password, name: `${firstName} ${lastName}`.trim() })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
      // error is surfaced via the error state from useSignup() — no additional handling needed here
    } catch (_error) {
      /* error tracked in hook state */
    }
  }

  return (
    <div
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
              'bg-surface-container-lowest rounded-2xl shadow-xl shadow-on-surface/5',
            )}
          >
            <AuthBrandHeader />

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div className={cm.grid({ cols: 2, gap: 'sm' })}>
                <FieldText
                  id="firstName"
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  icon="person"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={setFirstName}
                  required
                />
                <FieldText
                  id="lastName"
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  icon="person"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={setLastName}
                  required
                />
              </div>
              <FieldText
                id="email"
                label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                icon="mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                required
              />
              <FieldText
                id="password"
                label={t('auth.login.password', {}, { defaultValue: 'Password' })}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                required
              />
              <FieldText
                id="confirmPassword"
                label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                icon="lock"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
              />

              {!passwordsMatch ? (
                <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-error')}>
                  {t(
                    'auth.signup.passwordsDoNotMatchPeriod',
                    {},
                    { defaultValue: 'Passwords do not match.' },
                  )}
                </p>
              ) : null}

              {error ? (
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
              ) : null}

              <button
                type="submit"
                disabled={isPending || !passwordsMatch}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'text-white bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] transition-all disabled:opacity-60',
                )}
              >
                {isPending
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
                  cm.sp('ml', 1),
                  'font-bold text-primary hover:underline decoration-2 underline-offset-4',
                )}
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

interface FieldTextProps {
  id: string
  label: string
  icon: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

function FieldText({
  id,
  label,
  icon,
  type,
  autoComplete,
  value,
  onChange,
  required,
}: FieldTextProps) {
  const cm = getClassMap()
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
          'bg-surface-container-low rounded-xl py-3 ring-1 ring-outline-variant/40 focus-within:ring-2 focus-within:ring-primary',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-on-surface-variant',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface outline-none',
          )}
        />
      </div>
    </div>
  )
}
