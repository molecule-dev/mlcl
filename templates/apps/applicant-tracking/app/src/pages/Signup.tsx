import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LoginBrandPanel } from '../components/LoginBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

interface RegisterPayload {
  email: string
  password: string
  name?: string
  metadata?: Record<string, unknown>
}

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth() as ReturnType<typeof useAuth> & {
    register?: (payload: RegisterPayload) => Promise<unknown>
  }
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
  const firstName = authFormFields.firstName ?? ''
  const setFirstName = (value: string): void => setAuthFormField('firstName', value)
  const lastName = authFormFields.lastName ?? ''
  const setLastName = (value: string): void => setAuthFormField('lastName', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError(t('signup.missingFields', {}, { defaultValue: 'Email and password are required.' }))
      return
    }
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      if (typeof auth.register === 'function') {
        await auth.register({
          email,
          password,
          name: fullName || undefined,
          metadata: { firstName, lastName },
        })
      }
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signup.failed', {}, { defaultValue: 'Sign-up failed.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="page-signup"
      className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}
    >
      <LoginBrandPanel />
      <main
        className={cm.cn(
          'flex-1 flex items-center justify-center',
          cm.sp('px', 6),
          cm.sp('py', 10),
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.sp('mb', 8)}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('signup.eyebrow', {}, { defaultValue: 'Free for 30 days · No credit card' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'signup.subheading',
                { app: APP_NAME },
                { defaultValue: 'Spin up a hiring board in 60 seconds. Invite the team later.' },
              )}
            </p>
          </header>

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              data-mol-id="signup-error"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mb', 6),
                cm.textSize('sm'),
                'rounded-xl bg-error/10 text-error font-semibold',
              )}
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <FieldGroup
                id="firstName"
                type="text"
                icon="person"
                label={t('form.firstName', {}, { defaultValue: 'First name' })}
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                dataMolId="signup-firstname"
                required={false}
              />
              <FieldGroup
                id="lastName"
                type="text"
                icon="person"
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                dataMolId="signup-lastname"
                required={false}
              />
            </div>
            <FieldGroup
              id="email"
              type="email"
              icon="mail"
              label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
              placeholder={t(
                'auth.passwordPlaceholderCompanyEmail',
                {},
                { defaultValue: 'you@company.com' },
              )}
              value={email}
              onChange={setEmail}
              autoComplete="email"
              dataMolId="signup-email"
              required
            />
            <FieldGroup
              id="password"
              type="password"
              icon="lock"
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              placeholder={t(
                'common.atLeast12Characters',
                {},
                { defaultValue: 'At least 12 characters' },
              )}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              dataMolId="signup-password"
              required
            />
            <FieldGroup
              id="confirm"
              type="password"
              icon="lock"
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              placeholder={t(
                'signup.confirmPlaceholder',
                {},
                { defaultValue: 'Re-enter your password' },
              )}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              dataMolId="signup-confirm"
              required
            />

            <button
              type="submit"
              disabled={loading}
              data-mol-id="signup-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
              )}
            >
              {loading
                ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
                : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </button>
          </form>

          <div className={cm.sp('mt', 8)}>
            <OAuthButtons />
          </div>

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
            <Link
              to="/login"
              data-mol-id="signup-login-link"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>

          <p
            className={cm.cn(
              cm.sp('mt', 6),
              cm.textCenter,
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
            <button
              type="button"
              onClick={openTerms}
              data-mol-id="signup-terms-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              data-mol-id="signup-privacy-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </button>
          </p>
        </div>
      </main>
      {modals}
    </div>
  )
}

interface FieldGroupProps {
  id: string
  type: string
  label: string
  placeholder?: string
  icon: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  dataMolId?: string
}

function FieldGroup({
  id,
  type,
  label,
  placeholder,
  icon,
  value,
  onChange,
  autoComplete,
  required,
  dataMolId,
}: FieldGroupProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          data-mol-id={dataMolId}
          className={cm.cn(
            cm.sp('ml', 3),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}

export default Signup
