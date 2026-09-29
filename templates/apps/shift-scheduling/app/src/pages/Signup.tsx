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
  firstName: string
  lastName: string
  email: string
  password: string
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
    if (password !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (typeof auth.register === 'function') {
        await auth.register({ firstName, lastName, email, password })
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
    <div className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}>
      <LoginBrandPanel
        features={[
          {
            icon: 'bolt',
            title: t('signup.feature.dispatch', {}, { defaultValue: 'Automated Shift Dispatch' }),
            body: t(
              'signup.feature.dispatchBody',
              {},
              {
                defaultValue:
                  'Fill sudden call-outs in under three minutes with automated worker qualification and instant claim notifications.',
              },
            ),
          },
          {
            icon: 'notifications_active',
            title: t(
              'signup.feature.overtimeAlerts',
              {},
              { defaultValue: 'Real-Time Overtime & Labor Alerts' },
            ),
            body: t(
              'signup.feature.overtimeAlertsBody',
              {},
              {
                defaultValue:
                  'See overtime risk build before the shift starts and get flagged before it becomes a compliance problem.',
              },
            ),
          },
          {
            icon: 'smartphone',
            title: t(
              'signup.feature.mobileRoster',
              {},
              { defaultValue: 'Mobile Roster & Attendance' },
            ),
            body: t(
              'signup.feature.mobileRosterBody',
              {},
              {
                defaultValue:
                  'The whole team sees the published roster on their phone and clocks in and out from the floor.',
              },
            ),
          },
        ]}
      />
      <main
        className={cm.cn(
          'flex-1 flex items-center justify-center',
          cm.sp('px', 6),
          cm.sp('py', 10),
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.sp('mb', 8)}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-primary-dark',
              )}
            >
              {t('signup.eyebrow', {}, { defaultValue: 'Free for 30 days · No credit card' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'signup.subheading',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Spin up an {{app}} workspace in 60 seconds. Invite the team later.',
                },
              )}
            </p>
          </header>

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
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
                placeholder="Priya"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                required
              />
              <FieldGroup
                id="lastName"
                type="text"
                icon="person"
                label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                placeholder="Iyer"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                required
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
              required
            />
            <FieldGroup
              id="password"
              type="password"
              icon="lock"
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              placeholder="At least 12 characters"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />
            <FieldGroup
              id="confirm"
              type="password"
              icon="lock"
              label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
              placeholder="Re-enter your password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
            />

            <button
              type="submit"
              disabled={loading}
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
                ? t('common.creatingWorkspaceEllipsis', {}, { defaultValue: 'Creating workspace…' })
                : t('signup.cta', {}, { defaultValue: 'Create workspace' })}
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
            {t('signup.haveAccount', {}, { defaultValue: 'Already have a workspace?' })}{' '}
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
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
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              data-mol-id="signup-privacy-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
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
  placeholder: string
  icon: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
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
