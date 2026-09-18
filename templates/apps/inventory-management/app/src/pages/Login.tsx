import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
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
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isLoggingIn = status === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // surfaced via `error` — the hook exposes the error to the UI
    }
  }

  return (
    <>
      <AuthShell
        heading={t(
          'login.heading',
          { appName: APP_NAME },
          { defaultValue: 'Sign in to {{appName}}' },
        )}
        subheading={t(
          'login.subheading',
          {},
          { defaultValue: 'Manage every SKU and warehouse in one console.' },
        )}
        bottomLinkText={t(
          'login.noAccount',
          { appName: APP_NAME },
          { defaultValue: "Don't have a {{appName}} account?" },
        )}
        bottomLinkLabel={t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
        bottomLinkTo="/signup"
      >
        <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
          <FormField
            icon="alternate_email"
            label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="ops@yourwarehouse.com"
            required
          />
          <FormField
            icon="lock"
            label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
            rightLink={{
              to: '/forgot-password',
              label: t('auth.login.forgotPassword', {}, { defaultValue: 'Forgot password?' }),
            }}
          />

          {error && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-error-container text-on-error-container border border-error/20',
              )}
            >
              {error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.h(12),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
            )}
          >
            {isLoggingIn
              ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
              : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            <span
              className={cm.cn('material-symbols-outlined text-[18px]')}
              data-icon="arrow_forward"
            >
              arrow_forward
            </span>
          </button>
        </form>

        <OAuthButtons />

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
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
      </AuthShell>
      {modals}
    </>
  )
}

interface FormFieldProps {
  label: string
  icon: string
  type: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  rightLink?: { to: string; label: string }
  id?: string
}

export function FormField({
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  rightLink,
  id,
}: FormFieldProps) {
  const cm = getClassMap()
  // Auto-derive a stable id from the label when one is not provided so the
  // <label htmlFor> / <input id> pairing always works (required for both
  // accessibility and Playwright's getByLabel lookups).
  const inputId =
    id ??
    'fld-' +
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
  return (
    <div className={cm.stack(2)}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <label
          htmlFor={inputId}
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant',
          )}
        >
          {label}
        </label>
        {rightLink && (
          <Link
            to={rightLink.to}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {rightLink.label}
          </Link>
        )}
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.h(12),
          'rounded-xl border border-outline-variant bg-surface-container-low transition-colors focus-within:border-primary focus-within:bg-surface focus-within:shadow-sm',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
          data-icon={icon}
        >
          {icon}
        </span>
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={cm.cn(
            cm.w('full'),
            'bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant',
          )}
        />
      </div>
    </div>
  )
}

export default Login
