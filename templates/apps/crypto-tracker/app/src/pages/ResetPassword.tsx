import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { FloatingInput } from '../components/FloatingInput.js'
import { SigilAuthShell } from '../components/SigilAuthShell.js'

export function ResetPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const isPending = confirmStatus === 'pending'
  const passwordsMismatch = !!confirmPassword && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordsMismatch || !token) return
    try {
      await confirmReset({ token, password })
      navigate('/login', { replace: true })
    } catch (_error) {
      // tracked in hook state
    }
  }

  return (
    <SigilAuthShell
      eyebrow={t('resetPassword.eyebrow', {}, { defaultValue: 'New cipher' })}
      heading={t('auth.resetPassword.setNewPassword', {}, { defaultValue: 'Set a new password' })}
      subheading={t(
        'resetPassword.subheading',
        {},
        { defaultValue: 'Pick something only you can decode.' },
      )}
      footer={
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link
            to="/login"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {!token ? (
        <p className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-md bg-error/10 text-error')}>
          {t(
            'resetPassword.missingToken',
            {},
            { defaultValue: 'This reset link is missing or invalid. Request a new one.' },
          )}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
          <FloatingInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            placeholder={t(
              'resetPassword.passwordPlaceholder',
              {},
              { defaultValue: 'New password' },
            )}
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

          {passwordsMismatch ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {t(
                'auth.signup.passwordsDoNotMatchPeriod',
                {},
                { defaultValue: 'Passwords do not match.' },
              )}
            </p>
          ) : null}

          {confirmError ? (
            <p
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-md bg-error/10 text-error',
              )}
            >
              {confirmError.message}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            color="primary"
            disabled={isPending || passwordsMismatch}
            className={cm.cn(cm.w('full'))}
          >
            {isPending
              ? t('common.resettingEllipsis', {}, { defaultValue: 'Resetting…' })
              : t('auth.resetPassword.button', {}, { defaultValue: 'Reset password' })}
          </Button>
        </form>
      )}
    </SigilAuthShell>
  )
}
