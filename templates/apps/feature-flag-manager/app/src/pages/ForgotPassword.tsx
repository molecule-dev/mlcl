import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'

const SURFACE_DARK = 'var(--color-background)'
const PANEL = 'var(--color-surface)'
const INPUT_BG = 'var(--color-input-background, var(--color-surface-container-low))'
const BORDER = 'var(--color-border)'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
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
      // Error tracked in hook state.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-code)' }}
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
        style={{ background: 'var(--color-primary)', filter: 'blur(140px)', opacity: 0.1 }}
        aria-hidden="true"
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn('text-center mb-6')}>
            <BrandWordmark as="span" size="lg" />
          </header>

          <div
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8), 'rounded-xl')}
            style={{
              backgroundColor: PANEL,
              border: `1px solid ${BORDER}`,
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div>
              <h2 className={cm.cn('text-lg font-bold text-on-surface')}>
                {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn('mt-1 text-xs text-on-surface-variant')}>
                {t(
                  'forgotPassword.subtitle',
                  {},
                  {
                    defaultValue:
                      'We\u2019ll send a one-time link to the email associated with your workspace.',
                  },
                )}
              </p>
            </div>

            {submitted ? (
              <div className={cm.cn('space-y-4')}>
                <div
                  className={cm.cn('rounded-md p-4 flex items-start gap-3')}
                  style={{
                    backgroundColor: 'var(--color-success-banner-bg)',
                    border: '1px solid var(--color-success-banner-border)',
                  }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-base shrink-0')}
                    style={{ color: 'var(--color-text-link)' }}
                    aria-hidden="true"
                  >
                    mark_email_read
                  </span>
                  <p className={cm.cn('text-sm text-on-surface')}>
                    {t(
                      'forgotPassword.success',
                      { email },
                      {
                        defaultValue: 'Check {{email}} for a reset link. It expires in 30 minutes.',
                      },
                    )}
                  </p>
                </div>
                <Link
                  to="/login"
                  className={cm.cn(
                    'block w-full text-center rounded-md py-2.5 text-sm font-mono font-bold transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-primary-cta)',
                  }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </Link>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
                <div>
                  <label
                    htmlFor="forgot-email"
                    className={cm.cn(
                      'block font-mono text-[10px] font-black uppercase tracking-widest mb-2',
                    )}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t(
                      'auth.passwordPlaceholderCompanyEmail',
                      {},
                      { defaultValue: 'you@company.com' },
                    )}
                    className={cm.cn(
                      'w-full rounded-md py-3 px-4 font-mono text-sm transition-colors',
                    )}
                    style={{
                      backgroundColor: INPUT_BG,
                      border: `1px solid ${BORDER}`,
                      color: 'var(--color-text-code)',
                    }}
                  />
                </div>

                {requestError && (
                  <div
                    role="alert"
                    className={cm.cn('rounded-md px-4 py-3 text-sm text-center')}
                    style={{
                      backgroundColor: 'var(--color-error-banner-bg)',
                      border: '1px solid var(--color-error-banner-border)',
                      color: 'var(--color-error-chip-text)',
                    }}
                  >
                    {requestError.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    'rounded-md py-3 text-sm font-mono font-bold transition-all hover:opacity-90 disabled:opacity-60',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-primary-cta)',
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
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={cm.cn(
                    'text-center text-xs font-bold transition-opacity hover:opacity-80',
                  )}
                  style={{ color: 'var(--color-text-link)' }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
