import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SimmerAuthShell } from '../components/SimmerAuthShell.js'
import { SimmerTextField } from '../components/SimmerTextField.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()

  const [password, setPassword] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [mismatchError, setMismatchError] = useState<string | null>(null)
  const isSubmitting = confirmStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedPassword = (formData.get('password') as string | null) ?? password
    const submittedConfirm = (formData.get('confirmPassword') as string | null) ?? confirmValue
    if (submittedPassword !== submittedConfirm) {
      setMismatchError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    if (submittedPassword.length < 8) {
      setMismatchError(
        t('simmer.reset.tooShort', {}, { defaultValue: 'Password must be at least 8 characters.' }),
      )
      return
    }
    if (!token) {
      setMismatchError(
        t('simmer.reset.missingToken', {}, { defaultValue: 'Reset link is invalid or expired.' }),
      )
      return
    }
    setMismatchError(null)
    try {
      await confirmReset({ token, password: submittedPassword })
      navigate('/login', { replace: true })
    } catch (_error) {
      // Error tracked in hook state via usePasswordReset
    }
  }

  return (
    <SimmerAuthShell
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'simmer.reset.subheading',
        {},
        { defaultValue: 'Your new password must be at least 8 characters.' },
      )}
      footer={
        <Link
          to="/login"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <SimmerTextField
          label={t('simmer.reset.newPassword', {}, { defaultValue: 'New password' })}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          withPasswordToggle
          placeholder={t(
            'common.atLeast8Characters',
            {},
            { defaultValue: 'At least 8 characters' },
          )}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SimmerTextField
          label={t('auth.signup.confirmNewPassword', {}, { defaultValue: 'Confirm new password' })}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          withPasswordToggle
          placeholder={t(
            'simmer.reset.confirmPlaceholder',
            {},
            { defaultValue: 'Re-enter your password' },
          )}
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
        />

        {mismatchError ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-warning-container text-on-warning-container',
            )}
          >
            {mismatchError}
          </div>
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
          disabled={isSubmitting}
          className={cm.cn(
            cm.fontWeight('bold'),
            'w-full h-[48px] bg-accent hover:bg-accent/90 text-on-accent rounded-lg shadow-sm shadow-orange-500/20 active:scale-[0.98] transition-all focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
        </button>
      </form>
    </SimmerAuthShell>
  )
}
