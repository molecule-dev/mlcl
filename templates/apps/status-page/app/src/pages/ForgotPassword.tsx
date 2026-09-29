import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

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

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // requestReset rejection is surfaced via the hook's requestError state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-bg)', color: 'var(--mol-color-text)' }}
      data-mol-id="page-forgot-password"
    >
      <div
        className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.10)',
                  border: '1px solid rgba(16, 185, 129, 0.30)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: BRAND_COLOR }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t(
                    'forgotPassword.eyebrow',
                    { app: APP_NAME },
                    { defaultValue: 'recovery · {{app}} access' },
                  )}
                </span>
              </div>
            </div>
            <h1>
              <BrandWordmark as="span" size="lg" />
            </h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div>
              <h2 className={cm.cn('text-lg font-bold')}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                {t(
                  'forgotPassword.subtitle',
                  {},
                  { defaultValue: 'Enter your email and we will send a reset link.' },
                )}
              </p>
            </div>

            {submitted ? (
              <div
                className={cm.cn('rounded-md px-4 py-4 text-sm')}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.40)',
                  color: 'var(--color-link-hover)',
                }}
                role="status"
              >
                <p
                  className={cm.cn(
                    'font-mono text-[11px] font-extrabold uppercase tracking-widest',
                  )}
                >
                  {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
                </p>
                <p className={cm.cn('mt-1 text-on-surface')}>
                  {t(
                    'forgotPassword.success',
                    { email },
                    {
                      defaultValue:
                        'If an account exists for {{email}}, a reset link has been sent.',
                    },
                  )}
                </p>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
                <div>
                  <label
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono',
                    )}
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="forgot-email"
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t(
                      'forgotPassword.emailPlaceholder',
                      {},
                      { defaultValue: 'you@team.example' },
                    )}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      'rounded-md font-mono',
                    )}
                    style={{
                      backgroundColor: 'var(--color-auth-input-bg)',
                      border: '1px solid var(--color-auth-border)',
                      color: 'var(--mol-color-text)',
                    }}
                  />
                </div>
                {requestError && (
                  <div
                    role="alert"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-md text-center',
                    )}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.10)',
                      border: '1px solid rgba(239, 68, 68, 0.40)',
                      color: 'var(--color-auth-error-text)',
                    }}
                  >
                    {requestError.message}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-md font-mono font-bold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60',
                  )}
                  style={{
                    backgroundColor: BRAND_COLOR,
                    color: 'var(--color-auth-on-primary)',
                    boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.6)',
                  }}
                >
                  {isSubmitting
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t(
                        'auth.forgotPassword.sendResetLink',
                        {},
                        { defaultValue: 'Send reset link' },
                      )}
                </button>
              </form>
            )}
          </div>

          <footer
            className={cm.cn('mt-6 text-center text-sm')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>
              <Link
                to="/login"
                className={cm.cn('font-bold hover:underline inline-flex items-center gap-1')}
                style={{ color: BRAND_COLOR }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_back
                </span>
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
