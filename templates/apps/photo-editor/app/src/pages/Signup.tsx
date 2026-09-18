import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
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
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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

  const isSigningUp = status === 'pending'
  const passwordMismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/library', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field
    }
  }

  return (
    <AuthShell
      eyebrow={t('signup.eyebrow', {}, { defaultValue: '// create account' })}
      heading={t('signup.heading', {}, { defaultValue: 'Build your darkroom' })}
      subheading={t(
        'signup.subheading',
        { appName: APP_NAME },
        {
          defaultValue:
            'A free {{appName}} account unlocks the full editor and 200MB of cloud library.',
        },
      )}
      bottomLink={{
        to: '/login',
        prompt: t(
          'auth.login.alreadyHaveAccount',
          {},
          { defaultValue: 'Already have an account?' },
        ),
        cta: t('auth.login.signInButton', {}, { defaultValue: 'Sign in' }),
      }}
      showOAuth
      oauth={<OAuthButtons />}
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')} onSubmit={handleSubmit}>
        <Field
          id="name"
          type="text"
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          placeholder={t('signup.namePlaceholder', {}, { defaultValue: 'Astrid Halvorsen' })}
          icon="person"
          value={name}
          autoComplete="name"
          onChange={setName}
        />
        <Field
          id="email"
          type="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          placeholder={t(
            'signup.emailPlaceholder',
            {},
            { defaultValue: 'photographer@lustra.studio' },
          )}
          icon="mail"
          value={email}
          required
          autoComplete="email"
          onChange={setEmail}
        />
        <PasswordField
          id="password"
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          placeholder={t(
            'common.atLeast8Characters',
            {},
            { defaultValue: 'At least 8 characters' },
          )}
          value={password}
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <Field
          id="confirm"
          type={showPassword ? 'text' : 'password'}
          label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          placeholder={t('signup.confirmPlaceholder', {}, { defaultValue: 'Match the line above' })}
          icon="key"
          value={confirm}
          required
          autoComplete="new-password"
          onChange={setConfirm}
        />

        {(error || passwordMismatch) && (
          <div
            role="alert"
            className={cm.cn('px-4 py-3 text-sm text-center rounded-xl')}
            style={{
              color: 'var(--mol-color-error)',
              backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
            }}
          >
            {passwordMismatch
              ? t('signup.passwordMismatch', {}, { defaultValue: 'Passwords don\u2019t match.' })
              : error?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSigningUp}
          data-mol-id="signup-submit"
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full py-3.5 mt-2 rounded-lg text-white text-base',
            'bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] hover:opacity-90 active:scale-95',
            'transition-all disabled:opacity-60 shadow-lg',
          )}
        >
          {isSigningUp
            ? t('common.creatingAccountEllipsis', {}, { defaultValue: 'Creating account…' })
            : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
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

interface FieldProps {
  id: string
  type: string
  label: string
  placeholder: string
  icon: string
  value: string
  required?: boolean
  autoComplete?: string
  onChange: (v: string) => void
}

function Field({
  id,
  type,
  label,
  placeholder,
  icon,
  value,
  required,
  autoComplete,
  onChange,
}: FieldProps) {
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
          required={required}
          autoComplete={autoComplete}
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

interface PasswordFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (v: string) => void
  autoComplete?: string
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  show,
  onToggle,
  onChange,
  autoComplete,
}: PasswordFieldProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
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
          lock
        </span>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            'w-full bg-transparent border-none outline-none text-[var(--photo-input-text)] placeholder:text-[var(--photo-input-placeholder)] font-medium',
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show
              ? t('signup.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('signup.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.cn(
            'ml-2 text-[var(--photo-panel-text-muted)] hover:text-[var(--photo-panel-text-highlight)] transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default Signup
