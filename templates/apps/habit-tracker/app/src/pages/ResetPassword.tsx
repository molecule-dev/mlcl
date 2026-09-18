import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthInput } from '../components/AuthInput.js'
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
  const [confirmPassword, setConfirmPassword] = useState('')
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = confirmStatus === 'pending'
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // intentionally ignored — failure state is tracked in hooks via confirmReset/login error states
    }
  }

  return (
    <>
      <AuthShell
        eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'Restart the chain' })}
        heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
        subheading={t(
          'resetPassword.subheading',
          {},
          { defaultValue: 'Pick something strong. Then keep building the streak.' },
        )}
        footer={
          <>
            <Link
              to="/login"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.textPrimary,
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
              <button
                type="button"
                onClick={openTerms}
                className={cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'hover:underline')}
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>{' '}
              {t('common.and', {}, { defaultValue: 'and' })}{' '}
              <button
                type="button"
                onClick={openPrivacy}
                className={cm.cn(cm.fontWeight('semibold'), cm.textPrimary, 'hover:underline')}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </p>
          </>
        }
      >
        <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            icon="mail"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          />
          <AuthInput
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            icon="key"
            placeholder={t(
              'resetPassword.tokenPlaceholder',
              {},
              { defaultValue: 'Reset code from email' },
            )}
            label={t('auth.resetPassword.resetCode', {}, { defaultValue: 'Reset code' })}
          />
          <AuthInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            icon="lock"
            placeholder={t(
              'common.atLeast8Characters',
              {},
              { defaultValue: 'At least 8 characters' },
            )}
            label={t('resetPassword.passwordLabel', {}, { defaultValue: 'New password' })}
          />
          <AuthInput
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            icon="check"
            placeholder={t(
              'auth.signup.repeatYourPassword',
              {},
              { defaultValue: 'Repeat your password' },
            )}
            label={t('auth.signup.confirmPassword', {}, { defaultValue: 'Confirm password' })}
          />

          {passwordMismatch ? (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {t('resetPassword.mismatchError', {}, { defaultValue: 'Passwords don’t match.' })}
            </div>
          ) : null}

          {confirmError ? (
            <div
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-container text-on-error-container',
              )}
            >
              {confirmError.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || passwordMismatch}
            className={cm.cn(
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'w-full text-on-primary rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
          >
            {isSubmitting
              ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
              : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
          </button>
        </form>
      </AuthShell>
      {modals}
    </>
  )
}
