import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  const [token, setToken] = useState(searchParams.get('token') || '')
  const urlEmail = searchParams.get('email') ?? undefined
  // Cross-view auth form persistence — the reset link's ?email= seeds it and
  // wins; the email also carries from the Forgot/Login views. Cleared on success.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState(urlEmail ? { initialFields: { email: urlEmail } } : undefined)
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
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

  const isSubmitting = confirmStatus === 'pending'
  const passwordMismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/library', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field
    }
  }

  return (
    <AuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: '// set new password' })}
      heading={t('resetPassword.heading', {}, { defaultValue: 'Choose a new keystroke' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        {
          defaultValue:
            'Use at least 8 characters with a mix of letters and digits. We never store the plaintext.',
        },
      )}
      bottomLink={{
        to: '/login',
        prompt: t('resetPassword.gotIt', {}, { defaultValue: 'Already updated?' }),
        cta: t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' }),
      }}
    >
      <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')} onSubmit={handleSubmit}>
        <ResetField
          id="email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          icon="mail"
          type="email"
          placeholder={t(
            'resetPassword.emailPlaceholder',
            {},
            { defaultValue: 'photographer@lustra.studio' },
          )}
          value={email}
          autoComplete="email"
          required
          onChange={setEmail}
        />
        <ResetField
          id="token"
          label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
          icon="vpn_key"
          type="text"
          placeholder={t('resetPassword.tokenPlaceholder', {}, { defaultValue: 'From the email' })}
          value={token}
          required
          onChange={setToken}
        />
        <PasswordRow
          id="password"
          label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
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
        <ResetField
          id="confirm"
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          icon="key"
          type={showPassword ? 'text' : 'password'}
          placeholder={t(
            'resetPassword.confirmPlaceholder',
            {},
            { defaultValue: 'Match the line above' },
          )}
          value={confirm}
          autoComplete="new-password"
          required
          onChange={setConfirm}
        />

        {(confirmError || passwordMismatch) && (
          <div
            role="alert"
            className={cm.cn('px-4 py-3 text-sm text-center rounded-xl border')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
              color: 'var(--mol-color-error)',
              borderColor: 'color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
            }}
          >
            {passwordMismatch
              ? t(
                  'resetPassword.passwordMismatch',
                  {},
                  { defaultValue: 'Passwords don\u2019t match.' },
                )
              : confirmError?.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          data-mol-id="reset-submit"
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full py-3.5 mt-2 rounded-lg text-white text-base',
            'hover:opacity-90 active:scale-95',
            'transition-all disabled:opacity-60 shadow-lg',
          )}
          style={{
            background: 'linear-gradient(to right, var(--photo-accent), var(--photo-danger))',
          }}
        >
          {isSubmitting
            ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          'font-mono text-[10px] uppercase tracking-widest text-[var(--photo-text-muted)]',
        )}
      >
        <button
          type="button"
          onClick={openPrivacy}
          className={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}
        >
          {t('footer.privacy', {}, { defaultValue: 'Privacy' })}
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={openTerms}
          className={cm.cn('hover:text-[var(--photo-danger)] transition-colors')}
        >
          {t('footer.terms', {}, { defaultValue: 'Terms' })}
        </button>
      </div>
      {legalModals}
    </AuthShell>
  )
}

interface ResetFieldProps {
  id: string
  label: string
  placeholder: string
  icon: string
  type: string
  value: string
  required?: boolean
  autoComplete?: string
  onChange: (v: string) => void
}

function ResetField({
  id,
  label,
  placeholder,
  icon,
  type,
  value,
  required,
  autoComplete,
  onChange,
}: ResetFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex flex-col gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn('text-[10px] font-mono font-bold uppercase tracking-widest')}
        style={{ color: 'var(--photo-panel-text-muted)' }}
      >
        {label}
      </label>
      <div
        className={cm.cn('flex items-center px-4 py-3.5 rounded-lg transition-colors border')}
        style={{
          backgroundColor: 'var(--photo-input-bg)',
          borderColor: 'var(--photo-input-border)',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-xl mr-3')}
          style={{ color: 'var(--photo-panel-text-muted)' }}
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
          className={cm.cn('w-full bg-transparent border-none outline-none font-medium')}
          style={{
            color: 'var(--photo-input-text)',
          }}
        />
      </div>
    </div>
  )
}

interface PasswordRowProps {
  id: string
  label: string
  placeholder: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (v: string) => void
  autoComplete?: string
}

function PasswordRow({
  id,
  label,
  placeholder,
  value,
  show,
  onToggle,
  onChange,
  autoComplete,
}: PasswordRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('flex flex-col gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn('text-[10px] font-mono font-bold uppercase tracking-widest')}
        style={{ color: 'var(--photo-panel-text-muted)' }}
      >
        {label}
      </label>
      <div
        className={cm.cn('flex items-center px-4 py-3.5 rounded-lg transition-colors border')}
        style={{
          backgroundColor: 'var(--photo-input-bg)',
          borderColor: 'var(--photo-input-border)',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-xl mr-3')}
          style={{ color: 'var(--photo-panel-text-muted)' }}
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
          className={cm.cn('w-full bg-transparent border-none outline-none font-medium')}
          style={{
            color: 'var(--photo-input-text)',
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            show
              ? t('resetPassword.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('resetPassword.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.cn('ml-2 transition-colors')}
          style={{ color: 'var(--photo-panel-text-muted)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default ResetPassword
