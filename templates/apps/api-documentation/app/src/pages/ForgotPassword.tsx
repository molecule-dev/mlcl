import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { LoginFooter } from '../components/LoginFooter.js'

const submitGradient = `linear-gradient(135deg, var(--color-primary), var(--mol-color-success))`

const gridBackground = {
  backgroundImage:
    'linear-gradient(color-mix(in srgb, var(--mol-color-text) 3%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--mol-color-text) 3%, transparent) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

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
      // Error tracked in hook state; UI renders requestError from the hook
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(120px)', opacity: 0.12 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-xl',
            )}
            style={{
              backgroundColor: 'var(--mol-color-surface)',
              border: '1px solid var(--mol-color-border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <AuthBrandHeader
              subtitle={
                submitted
                  ? t(
                      'forgotPassword.subtitleSent',
                      {},
                      { defaultValue: 'Check your email for a reset link.' },
                    )
                  : t(
                      'forgotPassword.subtitle',
                      {},
                      { defaultValue: 'Recover access to your API workspace.' },
                    )
              }
            />

            {submitted ? (
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
                  cm.textCenter,
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                  )}
                  style={{ background: submitGradient }}
                >
                  <span
                    className="material-symbols-outlined text-white text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <p
                  className={cm.cn(cm.textSize('base'))}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                >
                  {t(
                    'common.weSentAPasswordResetLink',
                    { email },
                    { defaultValue: 'We sent a password reset link to {{email}}.' },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={cm.cn('font-bold text-sm hover:underline')}
                  style={{ color: 'var(--color-brand-text)' }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </button>
              </div>
            ) : (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
                <div>
                  <label
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('mb', 2),
                      'block text-[0.6875rem] tracking-[0.05em] font-label',
                    )}
                    style={{ color: 'var(--mol-color-text-tertiary)' }}
                    htmlFor="email"
                  >
                    {t('forgotPassword.emailLabel', {}, { defaultValue: 'EMAIL' })}
                  </label>
                  <input
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('py', 4),
                      cm.sp('px', 5),
                      cm.textSize('sm'),
                      'rounded-lg transition-all',
                    )}
                    style={{
                      backgroundColor: 'var(--mol-color-background)',
                      border: '1px solid var(--mol-color-border)',
                      color: 'var(--mol-color-text)',
                    }}
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t(
                      'forgotPassword.emailPlaceholder',
                      {},
                      { defaultValue: 'developer@example.com' },
                    )}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {requestError && (
                  <div
                    data-mol-id="forgot-error"
                    role="alert"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'rounded-lg',
                    )}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
                      color: 'var(--mol-color-error)',
                      border:
                        '1px solid color-mix(in srgb, var(--mol-color-error) 40%, transparent)',
                    }}
                  >
                    {requestError.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.sp('mt', 2),
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'rounded-lg text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                  )}
                  style={{ background: submitGradient }}
                >
                  {isSubmitting
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
                </button>
              </form>
            )}
          </div>

          {!submitted && (
            <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
              <p
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                {t(
                  'auth.login.rememberedYourPassword',
                  {},
                  { defaultValue: 'Remembered your password?' },
                )}{' '}
                <Link
                  to="/login"
                  className={cm.cn(
                    'font-bold hover:underline decoration-2 underline-offset-4 ml-1',
                  )}
                  style={{ color: 'var(--color-brand-text)' }}
                >
                  {t('forgotPassword.signIn', {}, { defaultValue: 'Sign In' })}
                </Link>
              </p>
            </footer>
          )}
        </div>
      </main>
      <LoginFooter />
    </div>
  )
}
