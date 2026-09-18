import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthField } from '../components/AuthField.js'
import { CairnAuthBrandPanel } from '../components/CairnAuthBrandPanel.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await http.post('/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'auth.forgotPassword.couldNotSendResetLink',
              {},
              { defaultValue: 'Could not send reset link.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <CairnAuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
          cm.sp('py', 12),
          'w-full lg:w-1/2',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-secondary',
              )}
            >
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p
              className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'italic text-on-surface-variant')}
              style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
            >
              {t(
                'auth.forgotPassword.enterEmailDescription',
                {},
                { defaultValue: 'Enter your email and we will send you a reset link.' },
              )}
            </p>
          </header>

          {sent ? (
            <div
              className={cm.cn(
                cm.sp('mt', 8),
                cm.sp('p', 6),
                'rounded-2xl bg-primary/10 ring-1 ring-primary/30',
              )}
              role="status"
            >
              <p className={cm.cn(cm.fontWeight('extrabold'), 'text-primary')}>
                {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'forgotPassword.sentBody',
                  { email },
                  {
                    defaultValue:
                      'If an account exists for {{email}}, a reset link is on the way. The link expires in 30 minutes.',
                  },
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 8), 'space-y-5')}>
              <AuthField
                id="email"
                type="email"
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                placeholder={t(
                  'auth.passwordPlaceholderCompanyEmail',
                  {},
                  { defaultValue: 'you@company.com' },
                )}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />

              {error ? (
                <p
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-error/10 text-error',
                  )}
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.fontWeight('extrabold'),
                  'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
                )}
              >
                {loading
                  ? t('forgotPassword.submitting', {}, { defaultValue: 'Sending\u2026' })
                  : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              </button>
            </form>
          )}

          <p className={cm.cn(cm.sp('mt', 8), 'text-center text-sm')}>
            <Link
              to="/login"
              className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
            >
              {'\u2190 '}
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
