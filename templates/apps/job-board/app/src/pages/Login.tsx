import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LoginBrandPanel } from '../components/LoginBrandPanel.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { loadContent } from '../config.js'

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const { status, error, login } = useLogin()
  // Cross-view auth form persistence (email shared across Login/Signup/
  // Forgot/Reset, cleared on success) via the shared @molecule hook.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [password, setPassword] = useState('')
  const isLoggingIn = status === 'pending'
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
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
                {t('login.eyebrow', { app: APP_NAME }, { defaultValue: 'Welcome back to {{app}}' })}
              </p>
              <h1
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('login.heading', {}, { defaultValue: 'Sign in to your account' })}
              </h1>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'login.subheading',
                  {},
                  {
                    defaultValue:
                      'Pick up your search, advance your applications, hear back faster.',
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
                {error.message}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
            >
              <FieldGroup
                id="email"
                type="email"
                label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                placeholder={t(
                  'auth.passwordPlaceholderCompanyEmail',
                  {},
                  { defaultValue: 'you@company.com' },
                )}
                icon="mail"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <FieldGroup
                id="password"
                type="password"
                label={t('auth.login.password', {}, { defaultValue: 'Password' })}
                placeholder={t(
                  'login.passwordPlaceholder',
                  {},
                  { defaultValue: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
                )}
                icon="lock"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
              />
              <div className={cm.flex({ align: 'center', justify: 'end' })}>
                <Link
                  to="/forgot-password"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary hover:text-primary-container transition-colors',
                  )}
                >
                  {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {isLoggingIn
                  ? t('login.signingIn', {}, { defaultValue: 'Signing in\u2026' })
                  : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
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
              {t('login.noAccount', { app: APP_NAME }, { defaultValue: 'New to {{app}}?' })}{' '}
              <Link
                to="/signup"
                className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
              >
                {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
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
              {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
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
