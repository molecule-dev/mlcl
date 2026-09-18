import { useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)
  // In-place Privacy/Terms modals (the standalone /privacy and /terms routes
  // still exist for deep links) — shared @molecule legal-modal hook.
  const {
    openPrivacy,
    openTerms,
    modals: legalModals,
  } = useLegalModals({ appName: APP_NAME, loadContent })

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state — the hook surfaces it via its own error field
    }
  }

  return (
    <AuthShell
      eyebrow={t('forgotPassword.eyebrow', {}, { defaultValue: '// reset password' })}
      heading={t(
        submitted ? 'forgotPassword.successHeading' : 'forgotPassword.heading',
        {},
        { defaultValue: submitted ? 'Check your inbox' : 'Forgot the keystroke?' },
      )}
      subheading={t(
        submitted ? 'forgotPassword.successSubheading' : 'forgotPassword.subheading',
        {},
        {
          defaultValue: submitted
            ? 'A reset link is on its way. It expires in 30 minutes.'
            : 'Enter your account email and we\u2019ll send a one-time link to set a new password.',
        },
      )}
      bottomLink={{
        to: '/login',
        prompt: t('forgotPassword.remembered', {}, { defaultValue: 'Remembered it?' }),
        cta: t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' }),
      }}
    >
      {!submitted ? (
        <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
          <div className={cm.cn('flex flex-col gap-2')}>
            <label
              htmlFor="email"
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-muted)]',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
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
                mail
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t(
                  'forgotPassword.emailPlaceholder',
                  {},
                  { defaultValue: 'photographer@lustra.studio' },
                )}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  'w-full bg-transparent border-none outline-none text-[var(--photo-input-text)] placeholder:text-[var(--photo-input-placeholder)] font-medium',
                )}
              />
            </div>
          </div>

          {requestError && (
            <div
              role="alert"
              className={cm.cn('px-4 py-3 text-sm text-center rounded-xl')}
              style={{
                color: 'var(--mol-color-error)',
                backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
              }}
            >
              {requestError.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-mol-id="forgot-submit"
            className={cm.cn(
              cm.fontWeight('bold'),
              'w-full py-3.5 mt-2 rounded-lg text-white text-base',
              'bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] hover:opacity-90 active:scale-95',
              'transition-all disabled:opacity-60 shadow-lg',
            )}
          >
            {isSubmitting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          </button>
        </form>
      ) : (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.sp('py', 4),
          )}
        >
          <div
            className={cm.cn(
              'w-16 h-16 rounded-full bg-gradient-to-br from-[var(--photo-accent)] to-[var(--photo-danger)] flex items-center justify-center shadow-xl',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-white text-[32px]')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              mark_email_read
            </span>
          </div>
          <p className={cm.cn('text-sm text-[var(--photo-text-muted)] text-center max-w-xs')}>
            {t(
              'forgotPassword.successBody',
              { email },
              { defaultValue: 'If an account matches {{email}}, the link is on its way.' },
            )}
          </p>
        </div>
      )}

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

export default ForgotPassword
