import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandPanel } from '../components/AuthBrandPanel.js'
import { FormField } from './Login.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // tracked in hook state — requestError is surfaced via usePasswordReset()
    }
  }

  const isPending = requestStatus === 'pending'
  const isSuccess = submitted
  const error = requestError

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.grid({ cols: 1 }),
        'lg:grid-cols-2 bg-surface-container-lowest',
      )}
    >
      <AuthBrandPanel />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
        )}
      >
        <div className={cm.cn(cm.maxW('md'), 'w-full', cm.stack(8))}>
          <header className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('auth.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t('auth.forgotSubtitle', {}, { defaultValue: 'We will email you a reset link.' })}
            </p>
          </header>

          {isSuccess ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl bg-success/10 border border-success/20 text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-3xl text-success">mail</span>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t(
                  'auth.forgotPassword.emailSent',
                  { email },
                  { defaultValue: 'Check your inbox — we sent a reset link to {{email}}.' },
                )}
              </p>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-secondary hover:text-primary transition-colors',
                )}
              >
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={cm.stack(4)}>
              <FormField
                label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={isPending}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'w-full bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-60',
                )}
              >
                {isPending
                  ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                  : t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
              </button>
              {error && (
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'rounded-lg bg-error/10 text-error border border-error/20',
                  )}
                >
                  {error.message}
                </div>
              )}
            </form>
          )}

          <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-secondary hover:text-primary transition-colors',
              )}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
