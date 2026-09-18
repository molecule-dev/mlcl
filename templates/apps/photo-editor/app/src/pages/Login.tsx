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
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/library'
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
  const [showPassword, setShowPassword] = useState(false)
  // In-place Privacy/Terms modals (the standalone /privacy and /terms routes
  // still exist for deep links) — shared @molecule legal-modal hook.
  const {
    openPrivacy,
    openTerms,
    modals: legalModals,
  } = useLegalModals({ appName: APP_NAME, loadContent })
  const legalLinkClass = cm.cn(
    'font-bold text-[var(--photo-panel-text-highlight)] hover:text-[var(--photo-danger)] transition-colors',
  )

  const isLoggingIn = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      clearAuthForm()
      navigate(from, { replace: true })
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field
    }
  }

  return (
    <AuthShell
      eyebrow={t('login.eyebrow', {}, { defaultValue: '// sign in' })}
      heading={t('login.heading', {}, { defaultValue: 'Step into the darkroom' })}
      subheading={t(
        'login.subheading',
        {},
        {
          defaultValue:
            'Pick up where you left off — your library, presets, and history are waiting.',
        },
      )}
      bottomLink={{
        to: '/signup',
        prompt: t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" }),
        cta: t('login.signUp', {}, { defaultValue: 'Create one' }),
      }}
      showOAuth
      oauth={<OAuthButtons />}
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
        <FormField
          id="email"
          type="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          placeholder={t(
            'login.emailPlaceholder',
            {},
            { defaultValue: 'photographer@lustra.studio' },
          )}
          icon="mail"
          value={email}
          autoComplete="email"
          required
          onChange={setEmail}
        />
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <label
              htmlFor="password"
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-muted)]',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </label>
            <Link
              to="/forgot-password"
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-highlight)] hover:text-[var(--photo-danger)] transition-colors',
              )}
            >
              {t('auth.login.forgotShort', {}, { defaultValue: 'Forgot?' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              'flex items-center px-4 py-3.5 bg-[var(--photo-input-bg)] border border-[var(--photo-input-border)] rounded-lg focus-within:border-[var(--photo-input-border-focus)] transition-colors',
            )}
          >
            <span
              className={cm.cn(
                'material-symbols-outlined text-[var(--photo-panel-text-muted)] text-xl mr-3',
              )}
              aria-hidden="true"
            >
              lock
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cm.cn(
                'w-full bg-transparent border-none outline-none text-[var(--photo-input-text)] placeholder:text-[var(--photo-input-placeholder)] font-medium',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('login.hidePassword', {}, { defaultValue: 'Hide password' })
                  : t('login.showPassword', {}, { defaultValue: 'Show password' })
              }
              className={cm.cn(
                'ml-2 text-[var(--photo-panel-text-muted)] hover:text-[var(--photo-panel-text-highlight)] transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className={cm.cn('px-4 py-3 text-sm text-center rounded-xl')}
            style={{
              color: 'var(--mol-color-error)',
              backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
            }}
          >
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoggingIn}
          data-mol-id="login-submit"
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full py-3.5 mt-2 rounded-lg text-white text-base',
            'bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] hover:opacity-90 active:scale-95',
            'transition-all disabled:opacity-60 shadow-lg',
          )}
        >
          {isLoggingIn
            ? t('common.signingInEllipsis', {}, { defaultValue: 'Signing in…' })
            : t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </button>
      </form>

      <p
        className={cm.cn(
          'text-center text-[10px] font-mono leading-relaxed text-[var(--photo-text-muted)]',
        )}
      >
        {t(
          'auth.legalConsent.prefix',
          { appName: APP_NAME },
          { defaultValue: 'By continuing, you agree to {{appName}}’s' },
        )}{' '}
        <button type="button" onClick={openPrivacy} className={legalLinkClass}>
          {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button type="button" onClick={openTerms} className={legalLinkClass}>
          {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        </button>
        {'.'}
      </p>
      {legalModals}
    </AuthShell>
  )
}

interface FormFieldProps {
  id: string
  type: string
  label: string
  placeholder: string
  icon: string
  value: string
  autoComplete?: string
  required?: boolean
  onChange: (value: string) => void
}

function FormField({
  id,
  type,
  label,
  placeholder,
  icon,
  value,
  autoComplete,
  required,
  onChange,
}: FormFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex flex-col gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-muted)]',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          'flex items-center px-4 py-3.5 bg-[var(--photo-input-bg)] border border-[var(--photo-input-border)] rounded-lg focus-within:border-[var(--photo-input-border-focus)] transition-colors',
        )}
      >
        <span
          className={cm.cn(
            'material-symbols-outlined text-[var(--photo-panel-text-muted)] text-xl mr-3',
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            'w-full bg-transparent border-none outline-none text-[var(--photo-input-text)] placeholder:text-[var(--photo-input-placeholder)] font-medium',
          )}
        />
      </div>
    </div>
  )
}

export default Login
