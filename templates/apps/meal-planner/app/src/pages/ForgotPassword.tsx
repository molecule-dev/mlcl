import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SimmerAuthShell } from '../components/SimmerAuthShell.js'
import { SimmerTextField } from '../components/SimmerTextField.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const submitted = requestStatus === 'resolved'
  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedEmail = (formData.get('email') as string | null) ?? email
    try {
      await requestReset({ email: submittedEmail })
    } catch (_error) {
      // Error tracked in hook state via usePasswordReset
    }
  }

  // The Stitch design's brand-panel showcase: the "what happens next" steps.
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
          checklist
        </span>
        {t('simmer.forgot.aside.title', {}, { defaultValue: 'What happens next?' })}
      </h3>
      <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
        {(
          [
            {
              key: 'delivery',
              title: 'Instant magic delivery',
              body: 'We generate a secure reset link, good for 15 minutes, and place it softly in your inbox.',
            },
            {
              key: 'noPassword',
              title: 'No urgent passwords needed',
              body: 'One tap on the link opens your weekly dinner board, grocery aisles, and recipes.',
            },
            {
              key: 'freshPassphrase',
              title: 'Create a fresh passphrase',
              body: 'Set a new comfortable password now, or whenever you next plan your week.',
            },
          ] as const
        ).map((step, i) => (
          <li key={step.key} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-7 h-7 flex-none rounded-full bg-white/15 text-white font-bold text-xs',
              )}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-white')}>
                {t(`simmer.forgot.aside.${step.key}.title`, {}, { defaultValue: step.title })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-white/80')}>
                {t(`simmer.forgot.aside.${step.key}.body`, {}, { defaultValue: step.body })}
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
          lock_open
        </span>
        {t(
          'simmer.forgot.aside.dataSafe',
          {},
          {
            defaultValue:
              'Pantry data stays safe — your meal plan, grocery list, and recipe tags are preserved.',
          },
        )}
      </p>
    </div>
  )

  return (
    <SimmerAuthShell
      aside={aside}
      heading={t('simmer.forgot.title', {}, { defaultValue: 'Reset your kitchen password.' })}
      subheading={t(
        'simmer.forgot.subheading',
        {},
        {
          defaultValue:
            'Enter the email associated with your account and we will send a calm, one-click reset link.',
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
        {submitted ? (
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-2xl bg-primary-container text-on-primary-container',
            )}
            role="status"
          >
            {t(
              'simmer.forgot.success',
              {},
              {
                defaultValue:
                  'If an account with that email exists, a password reset link is on its way.',
              },
            )}
          </div>
        ) : null}
        <SimmerTextField
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder={t('auth.passwordPlaceholderEmail', {}, { defaultValue: 'you@example.com' })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {requestError ? (
          <div
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {requestError.message}
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
            ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
            : submitted
              ? t('simmer.forgot.resend', {}, { defaultValue: 'Send another reset link' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
        </button>
      </form>
    </SimmerAuthShell>
  )
}
