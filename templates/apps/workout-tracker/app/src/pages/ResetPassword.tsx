import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useLogin, usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ForjaAuthShell } from '../components/ForjaAuthShell.js'
import { ForjaTextField } from '../components/ForjaTextField.js'
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
  const [mismatch, setMismatch] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await confirmReset({ token, password })
      await login({ email, password })
      clearAuthForm()
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state — hook surfaces it to the UI
    }
  }

  return (
    <ForjaAuthShell
      heading={t('forja.reset.heading', {}, { defaultValue: 'Set a new password.' })}
      subheading={t(
        'forja.reset.subheading',
        {},
        { defaultValue: 'Pick something stronger than 1RM.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-primary-dark hover:underline uppercase tracking-wide',
          )}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {!searchParams.get('email') ? (
          <ForjaTextField
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            type="email"
            autoComplete="email"
            required
            placeholder={t(
              'forja.login.emailPlaceholder',
              {},
              { defaultValue: 'lifter@forja.app' },
            )}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : null}
        {!searchParams.get('token') ? (
          <ForjaTextField
            label={t('auth.resetPassword.resetToken', {}, { defaultValue: 'Reset token' })}
            type="text"
            required
            placeholder={t('forja.reset.tokenPlaceholder', {}, { defaultValue: 'r3set-t0ken' })}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        ) : null}
        <ForjaTextField
          label={t('forja.reset.newPassword', {}, { defaultValue: 'New password' })}
          type="password"
          autoComplete="new-password"
          required
          withPasswordToggle
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ForjaTextField
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          type="password"
          autoComplete="new-password"
          required
          withPasswordToggle
          placeholder={t('auth.passwordMask', {}, { defaultValue: '••••••••' })}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {confirmError || mismatch ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {mismatch
              ? t(
                  'auth.signup.passwordsDontMatchPeriod',
                  {},
                  { defaultValue: "Passwords don't match." },
                )
              : confirmError?.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-primary hover:bg-primary-light text-on-primary rounded-lg shadow-md shadow-primary/30 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wide',
          )}
        >
          {isSubmitting
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>

      <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
        {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
        <button
          type="button"
          onClick={openTerms}
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('nav.terms', {}, { defaultValue: 'Terms' })}
        </button>{' '}
        {t('common.and', {}, { defaultValue: 'and' })}{' '}
        <button
          type="button"
          onClick={openPrivacy}
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark hover:underline')}
        >
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </button>
      </p>
      {modals}
    </ForjaAuthShell>
  )
}
