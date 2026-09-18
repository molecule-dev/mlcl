import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { StillpointAuthShell } from '../components/StillpointAuthShell.js'
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

  const isSubmitting = confirmStatus === 'pending'
  const passwordsMatch = password === confirmPassword || confirmPassword.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) return
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/home', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via resetError / loginError
    }
  }

  return (
    <StillpointAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'stillpoint.reset.subheading',
        {},
        { defaultValue: 'Enter the token from your email and a new password.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <FloatingInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        />
        <FloatingInput
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
        />
        <FloatingInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder={t('stillpoint.reset.newPassword', {}, { defaultValue: 'New password' })}
        />
        <FloatingInput
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          placeholder={t(
            'auth.signup.confirmNewPassword',
            {},
            { defaultValue: 'Confirm new password' },
          )}
        />

        {!passwordsMatch ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error font-medium')}>
            {t(
              'auth.signup.passwordsDontMatchPeriod',
              {},
              { defaultValue: "Passwords don't match." },
            )}
          </p>
        ) : null}

        {confirmError ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {confirmError.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !passwordsMatch}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-xl shadow-sm shadow-accent/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          'mt-2',
        )}
      >
        <LegalModalLinks
          linkClassName={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
      </div>
    </StillpointAuthShell>
  )
}
