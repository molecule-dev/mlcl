import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
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
  const companyName = authFormFields.companyName ?? ''
  const setCompanyName = (value: string): void => setAuthFormField('companyName', value)
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    // Yield a frame so the spinner DOM update flushes before the network
    // request fires.
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        companyName,
      } as Parameters<typeof register>[0])
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Could not create account.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({}),
        'bg-surface text-on-surface antialiased flex-col md:flex-row',
      )}
    >
      <AuthBrandPanel />
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'w-full md:w-[45%] lg:p-12 relative',
        )}
      >
        <div className={cm.cn('md:hidden self-start mb-10')}>
          <BrandWordmark as="span" size="lg" />
        </div>

        <div className={cm.cn(cm.w('full'), 'max-w-[480px]')}>
          <header className={cm.cn(cm.sp('mb', 8), 'text-center md:text-left')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-[0.3em] text-primary',
              )}
            >
              {t('signup.eyebrow', {}, { defaultValue: 'Free 30-day trial' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'tracking-tight',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t('signup.subheading', {}, { defaultValue: 'Set up your books in under a minute.' })}
            </p>
          </header>

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className={cm.cn(
                cm.sp('p', 3),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                'rounded-lg bg-error/10 text-error',
              )}
            >
              {error}
            </div>
          ) : null}

          <form className={cm.cn('space-y-5')} onSubmit={handleSubmit}>
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              <Field
                id="signup-first-name"
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                value={firstName}
                onChange={setFirstName}
                placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Sarah' })}
                autoComplete="given-name"
              />
              <Field
                id="signup-last-name"
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                value={lastName}
                onChange={setLastName}
                placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Jenkins' })}
                autoComplete="family-name"
              />
            </div>
            <Field
              id="signup-company"
              label={t('signup.companyLabel', {}, { defaultValue: 'Company name' })}
              value={companyName}
              onChange={setCompanyName}
              placeholder={t('signup.companyPlaceholder', {}, { defaultValue: 'Horizon Tech' })}
              icon="business"
              autoComplete="organization"
            />
            <Field
              id="signup-email"
              type="email"
              label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              value={email}
              onChange={setEmail}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
              icon="mail"
              required
              autoComplete="email"
            />
            <Field
              id="signup-password"
              type="password"
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              value={password}
              onChange={setPassword}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              icon="lock"
              required
              autoComplete="new-password"
            />
            <Field
              id="signup-confirm"
              type="password"
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              value={confirm}
              onChange={setConfirm}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              icon="lock"
              required
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading}
              className={cm.cn(
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.w('full'),
                'bg-primary text-on-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-60',
              )}
            >
              {loading
                ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                : t('signup.submit', {}, { defaultValue: 'Create Account' })}
            </button>
          </form>

          <div className={cm.cn(cm.sp('mt', 6))}>
            <OAuthButtons />
          </div>

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textSize('sm'),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'transition-colors hover:opacity-80')}
              style={{ color: 'var(--color-accent-text, var(--color-accent))' }}
            >
              {t('signup.signInCta', {}, { defaultValue: 'Sign In' })}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  icon?: string
  required?: boolean
  autoComplete?: string
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  required,
  autoComplete,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'block uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span
            className={cm.cn(
              'absolute inset-y-0 left-0 px-3 flex items-center text-on-surface-variant pointer-events-none',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            icon ? cm.sp('pl', 10) : cm.sp('pl', 3),
            cm.sp('pr', 3),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.w('full'),
            'border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
          )}
        />
      </div>
    </div>
  )
}

export default Signup
