import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthAlert, AuthSubmitButton, AuthTextField } from '../components/AuthFormAtoms.js'
import { SnagrAuthShell } from '../components/SnagrAuthShell.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to the
  // other auth views (Login/Signup/Reset) via the shared @molecule hook.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'forgotPassword.error',
              {},
              { defaultValue: 'Could not send a reset link. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SnagrAuthShell
      heading={
        sent
          ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
          : t('forgotPassword.heading', {}, { defaultValue: 'Forgot your password?' })
      }
      subheading={
        sent
          ? t(
              'forgotPassword.sentSubheading',
              { email },
              { defaultValue: 'We sent a reset link to {{email}} — it expires in 30 minutes.' },
            )
          : t(
              'forgotPassword.subheading',
              {},
              { defaultValue: 'No worries — we will send a reset link to your inbox.' },
            )
      }
      footer={
        <p>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-primary hover:underline underline-offset-4',
            )}
          >
            ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5 items-center')}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-16 w-16 rounded-full bg-secondary/20 text-secondary',
            )}
          >
            <span
              className="material-symbols-outlined text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
          </span>
          <AuthAlert tone="success">
            {t(
              'forgotPassword.sentBanner',
              {},
              {
                defaultValue:
                  'Reset link sent. Check your spam folder if it does not appear in 5 minutes.',
              },
            )}
          </AuthAlert>
        </div>
      ) : (
        <form
          data-mol-id="forgot-password-form"
          onSubmit={handleSubmit}
          className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
        >
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          <AuthTextField
            id="email"
            label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            value={email}
            onChange={setEmail}
            icon="mail"
            type="email"
            autoComplete="email"
            placeholder={t(
              'auth.passwordPlaceholderEmail',
              {},
              { defaultValue: 'you@example.com' },
            )}
          />
          <AuthSubmitButton
            loading={loading}
            loadingLabel={t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })}
            label={t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
          />
        </form>
      )}
    </SnagrAuthShell>
  )
}
