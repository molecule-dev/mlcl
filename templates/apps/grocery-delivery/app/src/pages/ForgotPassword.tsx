import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, var(--color-gradient-end))`

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
      // Error tracked in hook state
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative bg-surface-container-low font-body text-on-surface overflow-hidden',
      )}
    >
      <div
        className={
          'fixed top-[-10%] left-[-10%] -z-10 w-[40rem] h-[40rem] rounded-full pointer-events-none'
        }
        style={{ background: BRAND_COLOR, filter: 'blur(80px)', opacity: 0.18 }}
      />
      <div
        className={
          'fixed bottom-[-10%] right-[-10%] -z-10 w-[35rem] h-[35rem] rounded-full pointer-events-none'
        }
        style={{ background: 'var(--color-gradient-end)', filter: 'blur(80px)', opacity: 0.16 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-3xl backdrop-blur-xl border border-surface/40',
            )}
            style={{
              background: 'color-mix(in srgb, var(--color-surface) 82%, transparent)',
              boxShadow: '0 20px 40px color-mix(in srgb, var(--color-primary) 15%, transparent)',
            }}
          >
            <AuthBrandHeader />

            <div className="text-center">
              <h2
                className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tight')}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {submitted
                  ? t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })
                  : t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {submitted
                  ? t(
                      'forgotPassword.successBody',
                      {},
                      { defaultValue: 'If that email is registered, a reset link is on its way.' },
                    )
                  : t(
                      'forgotPassword.body',
                      {},
                      { defaultValue: "We'll email you a secure link to set a new password." },
                    )}
              </p>
            </div>

            {!submitted ? (
              <form
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                onSubmit={handleSubmit}
              >
                <Field
                  id="email"
                  icon="mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  label={t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
                  placeholder={t(
                    'forgotPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'shopper@bushel.fresh' },
                  )}
                  autoComplete="email"
                  required
                />

                {requestError && (
                  <div
                    data-mol-id="forgotpassword-error"
                    role="alert"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'bg-error-container text-on-error-container rounded-xl',
                    )}
                  >
                    {requestError.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cm.cn(
                    cm.sp('py', 4),
                    cm.roundedFull,
                    cm.textSize('lg'),
                    cm.sp('mt', 2),
                    cm.fontWeight('bold'),
                    'text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                  )}
                  style={{ background: submitGradient }}
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
            ) : (
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'text-white hover:shadow-lg active:scale-95 transition-all',
                )}
                style={{ background: submitGradient }}
              >
                {t('forgotPassword.continue', {}, { defaultValue: 'Enter reset code' })}
              </button>
            )}
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              <Link
                to="/login"
                className={'font-bold hover:underline decoration-2 underline-offset-4'}
                style={{ color: 'var(--mol-color-primary-dark)' }}
              >
                {t('auth.backToSignInArrow', {}, { defaultValue: '← Back to sign in' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}

interface FieldProps {
  id: string
  icon: string
  type: string
  value: string
  onChange: (v: string) => void
  label: string
  placeholder: string
  autoComplete?: string
  required?: boolean
}

function Field({
  id,
  icon,
  type,
  value,
  onChange,
  label,
  placeholder,
  autoComplete,
  required,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'relative bg-surface/60 rounded-t-lg py-3.5 input-focus-border',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 0),
            cm.fontWeight('medium'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60',
          )}
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
