import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VivaceAuthShell } from '../components/VivaceAuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestReset, requestStatus, requestError } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [sent, setSent] = useState(false)
  const loading = requestStatus === 'pending'
  const error = requestError
    ? requestError instanceof Error
      ? requestError.message
      : String(requestError)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Fall back to reading the live input value so synthetic-fill flows
    // (E2E, accessibility scanners) still send a populated payload even
    // when React's controlled state hasn't caught the value setter.
    const form = e.currentTarget as HTMLFormElement
    const liveEmail =
      (form.querySelector('input[type=email]') as HTMLInputElement | null)?.value ?? email
    try {
      await requestReset({ email: liveEmail })
      setSent(true)
    } catch (_error) {
      // surfaced via requestError — the auth client sets its own error state
    }
  }

  return (
    <VivaceAuthShell
      heading={
        sent
          ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
          : t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })
      }
      subheading={
        sent
          ? t(
              'forgotPassword.sentSub',
              {},
              { defaultValue: 'A reset link is on its way to your inbox.' },
            )
          : t(
              'auth.forgotPassword.enterEmailDescription',
              {},
              { defaultValue: 'Enter your email and we will send you a reset link.' },
            )
      }
      footer={
        <Link
          to="/login"
          className={'font-medium transition-colors'}
          style={{ color: 'var(--anim-primary)' }}
        >
          {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        </Link>
      }
    >
      {sent ? (
        <p
          role="status"
          data-mol-id="forgot-sent"
          className={cm.cn(cm.textSize('sm'), cm.textCenter, cm.sp('mb', 4))}
          style={{ color: 'var(--anim-text-secondary)' }}
        >
          {t(
            'forgotPassword.checkInbox',
            { email },
            { defaultValue: 'We just sent reset instructions to {{email}}.' },
          )}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className={cm.stack(5)} data-mol-id="forgot-form">
        <div>
          <label
            htmlFor="email"
            className={cm.cn(cm.textSize('xs'), 'block font-mono uppercase tracking-widest mb-1.5')}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t(
              'forgotPassword.emailPlaceholder',
              {},
              { defaultValue: 'animator@vivace.io' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg focus:outline-none transition-colors',
            )}
            style={{
              backgroundColor: 'var(--anim-background)',
              color: 'var(--anim-text)',
              border: '1px solid var(--anim-border)',
            }}
          />
        </div>

        {error && (
          <p
            role="alert"
            data-mol-id="forgot-error"
            className={cm.cn(cm.textSize('xs'), 'font-mono')}
            style={{ color: 'var(--anim-danger)' }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-mol-id="forgot-submit"
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
            color: 'var(--color-on-primary)',
          }}
        >
          <span>
            {loading
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </span>
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>send</span>
        </button>
      </form>
    </VivaceAuthShell>
  )
}

export default ForgotPassword
