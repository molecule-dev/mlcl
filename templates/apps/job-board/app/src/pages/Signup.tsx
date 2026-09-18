import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LoginBrandPanel } from '../components/LoginBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

type Role = 'seeker' | 'employer'

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  const [role, setRole] = useState<Role>('seeker')
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
  const [localError, setLocalError] = useState<string | null>(null)
  const isSigningUp = status === 'pending'
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError(
        t('signup.passwordMismatch', {}, { defaultValue: 'Passwords don\u2019t match.' }),
      )
      return
    }
    try {
      await signup({
        email,
        password,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
      })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      /* error tracked in hook */
    }
  }

  return (
    <>
      <div className={cm.cn(cm.minH('screen'), 'flex bg-background text-on-surface antialiased')}>
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
                {t(
                  'signup.eyebrow',
                  { app: APP_NAME },
                  { defaultValue: 'Create your {{app}} account' },
                )}
              </p>
              <h1
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('signup.heading', {}, { defaultValue: 'Find roles, post roles, hire faster.' })}
              </h1>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'signup.subheading',
                  {},
                  {
                    defaultValue: 'Free to start for seekers and employers — no card required.',
                  },
                )}
              </p>
            </header>

            <RoleToggle role={role} onChange={setRole} />

            {error || localError ? (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.sp('mt', 6),
                  cm.textSize('sm'),
                  'rounded-xl bg-error/10 text-error font-semibold',
                )}
              >
                {localError ?? error?.message}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}
            >
              <div className={cm.cn('grid gap-4 md:grid-cols-2')}>
                <Field
                  id="firstName"
                  label={t('form.firstName', {}, { defaultValue: 'First name' })}
                  placeholder={t('signup.firstNamePlaceholder', {}, { defaultValue: 'Maya' })}
                  value={firstName}
                  onChange={setFirstName}
                  icon="badge"
                  autoComplete="given-name"
                />
                <Field
                  id="lastName"
                  label={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  placeholder={t('signup.lastNamePlaceholder', {}, { defaultValue: 'Chen' })}
                  value={lastName}
                  onChange={setLastName}
                  icon="badge"
                  autoComplete="family-name"
                />
              </div>
              <Field
                id="email"
                type="email"
                label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                placeholder={t(
                  'settings.emailPlaceholder',
                  {},
                  { defaultValue: 'you@company.com' },
                )}
                icon="mail"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <Field
                id="password"
                type="password"
                label={t('auth.login.password', {}, { defaultValue: 'Password' })}
                placeholder={t(
                  'signup.passwordPlaceholder',
                  {},
                  { defaultValue: 'At least 8 characters' },
                )}
                icon="lock"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                required
              />
              <Field
                id="confirm"
                type="password"
                label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
                placeholder={t(
                  'signup.confirmPlaceholder',
                  {},
                  { defaultValue: 'Repeat password' },
                )}
                icon="lock"
                value={confirmPassword}
                onChange={setConfirmPassword}
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
                  cm.textSize('sm'),
                  'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {isSigningUp
                  ? t('signup.creating', {}, { defaultValue: 'Creating account\u2026' })
                  : role === 'employer'
                    ? t('signup.ctaEmployer', {}, { defaultValue: 'Create employer account' })
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
                className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>

            <p
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textCenter,
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'auth.legalConsent',
                {},
                { defaultValue: 'By creating an account, you agree to our' },
              )}{' '}
              <button
                type="button"
                onClick={openTerms}
                className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>{' '}
              {t('common.and', {}, { defaultValue: 'and' })}{' '}
              <button
                type="button"
                onClick={openPrivacy}
                className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </p>
          </div>
        </main>
      </div>
      {modals}
    </>
  )
}

function RoleToggle({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const options: Array<{ value: Role; label: string; defaultLabel: string; hint: string }> = [
    {
      value: 'seeker',
      label: 'signup.roleSeeker',
      defaultLabel: 'I\u2019m looking for a job',
      hint: 'signup.roleSeekerHint',
    },
    {
      value: 'employer',
      label: 'signup.roleEmployer',
      defaultLabel: 'I\u2019m hiring talent',
      hint: 'signup.roleEmployerHint',
    },
  ]
  return (
    <div className={cm.cn('grid gap-3 md:grid-cols-2')}>
      {options.map((opt) => {
        const active = role === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cm.cn(
              cm.sp('p', 4),
              'text-left rounded-xl border transition-all',
              active
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold',
                active ? 'text-primary' : 'text-on-surface',
              )}
            >
              {t(opt.label, {}, { defaultValue: opt.defaultLabel })}
            </p>
            <p className={cm.cn('mt-1 text-xs text-on-surface-variant leading-relaxed')}>
              {t(
                opt.hint,
                {},
                {
                  defaultValue:
                    opt.value === 'seeker'
                      ? 'Search, apply, track. Free forever.'
                      : 'Post jobs, review applicants, run a hiring pipeline.',
                },
              )}
            </p>
          </button>
        )
      })}
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  placeholder?: string
  icon: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  type?: string
  required?: boolean
}

function Field({
  id,
  label,
  placeholder,
  icon,
  value,
  onChange,
  autoComplete,
  type = 'text',
  required,
}: FieldProps) {
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
