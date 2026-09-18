import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthShell } from '../components/AuthShell.js'
import { loadContent } from '../config.js'
import { FormField } from './Login.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [sent, setSent] = useState(false)
  // In-place Privacy/Terms modals (no navigation) — same bonded legal HTML
  // as the standalone /privacy and /terms routes, pre-loaded via loadContent.
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })

  const isSubmitting = requestStatus === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSent(true)
    } catch (_error) {
      // surfaced via `requestError` — the hook exposes the error to the UI
    }
  }

  return (
    <>
      <AuthShell
        heading={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
        subheading={
          sent
            ? t(
                'forgotPassword.subheadingSent',
                {},
                { defaultValue: 'Check your inbox for a one-time reset link.' },
              )
            : t(
                'forgotPassword.subheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Enter the email tied to your {{appName}} account and we will send a reset link.',
                },
              )
        }
        bottomLinkText={t('auth.login.rememberedIt', {}, { defaultValue: 'Remembered it?' })}
        bottomLinkLabel={t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
        bottomLinkTo="/login"
      >
        {sent ? (
          <div className={cm.cn(cm.stack(5))}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                cm.sp('p', 6),
                'rounded-2xl border border-secondary/30 bg-secondary/10 text-center',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-12 w-12 rounded-full bg-secondary text-white',
                )}
              >
                <span className="material-symbols-outlined" data-icon="mark_email_read">
                  mark_email_read
                </span>
              </span>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {t(
                  'forgotPassword.successHeadline',
                  { email },
                  { defaultValue: 'Reset link on its way to {{email}}' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'forgotPassword.successBody',
                  {},
                  {
                    defaultValue:
                      'Click the link in the email to set a new password. The link expires in 30 minutes.',
                  },
                )}
              </p>
            </div>
            <Link
              to="/login"
              className={cm.cn(
                cm.w('full'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.h(12),
                cm.fontWeight('bold'),
                'rounded-xl border border-outline-variant text-on-surface hover:bg-background-secondary transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                data-icon="arrow_back"
              >
                arrow_back
              </span>
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={cm.cn(cm.w('full'), cm.stack(5))}>
            <FormField
              label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              icon="alternate_email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="ops@yourwarehouse.com"
              autoComplete="email"
              required
            />

            {requestError && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-lg bg-error-container text-on-error-container border border-error/20',
                )}
              >
                {requestError.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cm.cn(
                cm.w('full'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.h(12),
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all',
              )}
            >
              {isSubmitting
                ? t('common.sendingLinkEllipsis', {}, { defaultValue: 'Sending link…' })
                : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="send">
                send
              </span>
            </button>
          </form>
        )}

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
          {t('auth.legalConsent', {}, { defaultValue: 'By continuing, you agree to our' })}{' '}
          <button
            type="button"
            onClick={openTerms}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </button>{' '}
          {t('common.and', {}, { defaultValue: 'and' })}{' '}
          <button
            type="button"
            onClick={openPrivacy}
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </button>
        </p>
      </AuthShell>
      {modals}
    </>
  )
}

export default ForgotPassword
