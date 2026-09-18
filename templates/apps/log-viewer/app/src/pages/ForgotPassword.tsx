import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'

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
      // Error tracked in hook state; no additional logging needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-severity-debug-light)',
      }}
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
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn('text-center mb-6')}>
            <h1 className={cm.cn('text-4xl font-extrabold tracking-tighter text-on-surface')}>
              {APP_NAME}
            </h1>
            <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>{APP_TAGLINE}</p>
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div>
              <h2 className={cm.cn('text-lg font-bold text-on-surface')}>
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
                role="status"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  cm.textSize('sm'),
                  'rounded-md text-center',
                )}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-success) 40%, transparent)',
                  color: 'var(--color-json-string)',
                }}
                data-mol-id="forgot-password-success"
              >
                {t(
                  'forgotPassword.success',
                  { email },
                  {
                    defaultValue: 'If an account exists for {{email}}, we just sent a reset link.',
                  },
                )}
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
                    style={{ color: 'var(--color-text-secondary)' }}
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
                      'auth.passwordPlaceholderEmail',
                      {},
                      { defaultValue: 'you@example.com' },
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
                      backgroundColor: 'var(--color-input-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                    data-mol-id="forgot-email"
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
                      backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                      color: 'var(--color-error-light)',
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
                    color: 'var(--color-background)',
                    boxShadow:
                      '0 12px 28px -12px color-mix(in srgb, var(--color-primary) 60%, transparent)',
                  }}
                  data-mol-id="forgot-submit"
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
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Link
              to="/login"
              className={cm.cn('font-bold hover:underline')}
              style={{ color: BRAND_COLOR }}
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}
