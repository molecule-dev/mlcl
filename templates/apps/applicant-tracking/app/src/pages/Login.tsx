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

export function Login() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
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
      setError(
        t(
          'login.missingFields',
          {},
          { defaultValue: 'Enter your email and password to continue.' },
        ),
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.failed', {}, { defaultValue: 'Sign-in failed.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-mol-id="page-login"
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
                { defaultValue: 'Open the board, advance candidates, ship offers.' },
              )}
            </p>
          </header>

          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              data-mol-id="login-error"
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
              dataMolId="login-email"
              required
            />
            <FieldGroup
              id="password"
              type="password"
              label={t('auth.login.password', {}, { defaultValue: 'Password' })}
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              icon="lock"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              dataMolId="login-password"
              required
            />

            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'flex items-center gap-2 text-on-surface-variant',
                )}
              >
                <input
                  type="checkbox"
                  className={cm.cn('rounded border-outline-variant accent-primary')}
                />
                {t('login.remember', {}, { defaultValue: 'Remember me for 30 days' })}
              </label>
              <Link
                to="/forgot-password"
                data-mol-id="login-forgot-link"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:text-primary-container transition-colors py-2',
                )}
              >
                {t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' })}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-mol-id="login-submit"
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
                ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
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
              data-mol-id="login-signup-link"
              className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline py-2')}
            >
              {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
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
              data-mol-id="login-terms-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline py-2')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </button>{' '}
            {t('common.and', {}, { defaultValue: 'and' })}{' '}
            <button
              type="button"
              onClick={openPrivacy}
              data-mol-id="login-privacy-link"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline py-2')}
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

export default Login
