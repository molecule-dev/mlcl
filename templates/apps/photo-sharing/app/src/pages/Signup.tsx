import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const SUBMIT_GRADIENT = 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'

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
  const [showPassword, setShowPassword] = useState(false)

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      await signup({ email, password, name: fullName || undefined })
      clearAuthForm()
      navigate('/explore', { replace: true })
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-surface-container-low font-body text-on-surface overflow-hidden',
      )}
    >
      <div
        className={
          'fixed top-0 right-0 -z-10 w-1/3 h-1/3 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none'
        }
        style={{ background: 'var(--color-glow-primary)' }}
        aria-hidden="true"
      />
      <div
        className={
          'fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none'
        }
        style={{ background: 'var(--color-glow-secondary)' }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-xl shadow-md',
            )}
          >
            <AuthBrandHeader />

            <div className="text-center">
              <h2
                className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {t('signup.heading', {}, { defaultValue: 'Start sharing' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                {t(
                  'signup.subheading',
                  {},
                  { defaultValue: 'Free for your first 5 photos. No card required.' },
                )}
              </p>
            </div>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2')}>
                <NamedInput
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  icon="badge"
                  value={firstName}
                  onChange={setFirstName}
                  autoComplete="given-name"
                />
                <NamedInput
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  icon="badge"
                  value={lastName}
                  onChange={setLastName}
                  autoComplete="family-name"
                />
              </div>
              <NamedInput
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                icon="mail"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
                placeholder={t(
                  'signup.emailPlaceholder',
                  {},
                  { defaultValue: 'photographer@obscura.studio' },
                )}
              />
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline focus-within:border-primary transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-outline',
                    )}
                  >
                    lock
                  </span>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
                    )}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                      cm.sp('ml', 2),
                      'text-outline hover:text-primary transition-colors',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
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
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: SUBMIT_GRADIENT }}
              >
                {isSigningUp
                  ? t('signup.submitting', {}, { defaultValue: 'Creating your portfolio…' })
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
              {t('signup.haveAccount', {}, { defaultValue: 'Already a member?' })}{' '}
              <Link
                to="/login"
                className={'font-bold hover:underline decoration-2 underline-offset-4 ml-1'}
                style={{ color: 'var(--color-primary)' }}
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

function NamedInput({
  label,
  icon,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
  placeholder,
}: {
  label: string
  icon: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
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
          'bg-surface-container-low rounded-t-lg py-3.5 border-b-2 border-outline focus-within:border-primary transition-colors',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
          )}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
