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

  // The Stitch design's brand-panel showcase: what restoring access preserves.
  const aside = (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'text-white')}>
      <h3
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'text-white',
        )}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
          shield
        </span>
        {t('simmer.reset.aside.title', {}, { defaultValue: 'Security in your calm kitchen' })}
      </h3>
      <p className={cm.cn(cm.textSize('xs'), 'text-white/80')}>
        {t(
          'simmer.reset.aside.body',
          {},
          {
            defaultValue:
              'We take your weekly dining rituals seriously. Restoring access preserves every saved routine:',
          },
        )}
      </p>
      <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
        {(
          [
            {
              key: 'access',
              title: '1. Instant access restored',
              body: 'Once saved, you land straight back on your active weekly dinner board without missing a beat.',
            },
            {
              key: 'preserved',
              title: '2. Preserved pantry & recipes',
              body: 'Your saved recipes, custom aisle sorting, and Sunday meal-prep notes stay untouched.',
            },
            {
              key: 'resync',
              title: '3. Automatic family re-sync',
              body: 'Connected partner devices reconnect seamlessly with your new credentials.',
            },
          ] as const
        ).map((step) => (
          <li key={step.key} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-base text-white mt-0.5')}
            >
              check_circle
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-white')}>
                {t(`simmer.reset.aside.${step.key}.title`, {}, { defaultValue: step.title })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-white/80')}>
                {t(`simmer.reset.aside.${step.key}.body`, {}, { defaultValue: step.body })}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          'text-white/80',
        )}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
          encrypted
        </span>
        {t(
          'simmer.reset.aside.encrypted',
          {},
          {
            defaultValue:
              'Sessions are end-to-end encrypted, so your private kitchen rituals stay yours.',
          },
        )}
      </p>
    </div>
  )

  return (
    <SimmerAuthShell
      aside={aside}
      heading={t('simmer.reset.title', {}, { defaultValue: 'Set your new kitchen password.' })}
      subheading={t(
        'simmer.reset.subheading',
        {},
        {
          defaultValue:
            'Choose a fresh, memorable passphrase to secure your weekly meal boards, pantry, and saved recipes.',
        },
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
