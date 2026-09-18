import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { loadContent } from '../config.js'

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
  const organization = authFormFields.organization ?? ''
  const setOrganization = (value: string): void => setAuthFormField('organization', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')

  const isSigningUp = status === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; UI reads signupError from the hook.
    }
  }

  return (
    <div
      className={cm.cn(
        'min-h-screen relative overflow-hidden bg-background text-on-surface antialiased',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-32 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary-fixed/10 blur-3xl pointer-events-none',
        )}
      />

      <header
        className={cm.cn(
          'relative z-10 flex items-center justify-between',
          cm.sp('px', 6),
          cm.sp('py', 4),
        )}
      >
        <Link to="/" className={cm.cn('text-xl font-extrabold tracking-tighter text-primary')}>
          {APP_NAME}
        </Link>
        <ThemeToggle />
      </header>

      <main className={cm.cn('relative z-10 flex justify-center', cm.sp('px', 6), cm.sp('py', 12))}>
        <div className={cm.cn(cm.maxW('md'), 'w-full')}>
          <header className={cm.sp('mb', 8)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {t('signup.eyebrow', {}, { defaultValue: 'Open the floor · free' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'signup.heading',
                { app: APP_NAME },
                { defaultValue: 'Create your {{app}} workspace' },
              )}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'signup.subheading',
                {},
                { defaultValue: 'No credit card. The Free plan is yours forever.' },
              )}
            </p>
          </header>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-md shadow-primary/5',
            )}
          >
            {error ? (
              <div
                role="alert"
                aria-live="assertive"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('mb', 5),
                  'rounded-xl bg-error/10 text-error text-sm font-semibold',
                )}
              >
                {error.message}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className={cm.stack(4)}>
              <Field
                id="name"
                type="text"
                icon="person"
                label={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
                placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Alex Reyes' })}
                value={name}
                onChange={setName}
                autoComplete="name"
              />
              <Field
                id="organization"
                type="text"
                icon="business"
                label={t('form.organization', {}, { defaultValue: 'Organization' })}
                placeholder={t(
                  'signup.orgPlaceholder',
                  {},
                  { defaultValue: 'Hartford City Council' },
                )}
                value={organization}
                onChange={setOrganization}
                autoComplete="organization"
              />
              <Field
                id="email"
                type="email"
                icon="mail"
                label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                placeholder={t('signup.emailPlaceholder', {}, { defaultValue: 'you@quorum.gov' })}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <Field
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
                required
              />

              <button
                type="submit"
                disabled={isSigningUp}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity',
                )}
              >
                {isSigningUp
                  ? t(
                      'common.creatingWorkspaceEllipsis',
                      {},
                      { defaultValue: 'Creating workspace…' },
                    )
                  : t('signup.cta', {}, { defaultValue: 'Create organization' })}
              </button>
            </form>

            <div className={cm.sp('mt', 8)}>
              <OAuthButtons />
            </div>

            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
                cm.sp('mt', 6),
              )}
            >
              <LegalModalLinks
                linkClassName={cm.cn(
                  cm.textSize('xs'),
                  'font-semibold text-on-surface-variant hover:text-primary transition-colors',
                )}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
            </div>
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
            <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

interface FieldProps {
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

function Field({
  id,
  type,
  label,
  placeholder,
  icon,
  value,
  onChange,
  autoComplete,
  required,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'flex items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[20px] text-on-surface-variant"
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
            'flex-1 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}
