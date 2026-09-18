import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await requestReset({ email })
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state; UI reads requestError from the hook.
    }
  }

  return (
    <div
      className={cm.cn(
        'min-h-screen relative overflow-hidden bg-background text-on-surface antialiased',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-32 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary-fixed/10 blur-3xl pointer-events-none',
        )}
      />

      <header
        className={cm.cn(
          'relative z-10 flex items-center justify-between',
          cm.sp('px', 6),
          cm.sp('py', 4),
        )}
      >
        <Link to="/" className={cm.cn('text-xl font-extrabold tracking-tighter text-primary')}>
          {APP_NAME}
        </Link>
        <ThemeToggle />
      </header>

      <main className={cm.cn('relative z-10 flex justify-center', cm.sp('px', 6), cm.sp('py', 12))}>
        <div className={cm.cn(cm.maxW('md'), 'w-full')}>
          <header className={cm.sp('mb', 8)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {t('auth.resetPassword.accountRecovery', {}, { defaultValue: 'Account recovery' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subheading',
                {},
                { defaultValue: 'Enter your email and we will send a secure reset link.' },
              )}
            </p>
          </header>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-md shadow-primary/5',
            )}
          >
            {!submitted ? (
              <>
                {requestError ? (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.sp('mb', 5),
                      'rounded-xl bg-error/10 text-error text-sm font-semibold',
                    )}
                  >
                    {requestError.message}
                  </div>
                ) : null}
                <form onSubmit={handleSubmit} className={cm.stack(4)}>
                  <Field
                    id="email"
                    type="email"
                    icon="mail"
                    label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    placeholder={t(
                      'forgotPassword.emailPlaceholder',
                      {},
                      { defaultValue: 'you@quorum.gov' },
                    )}
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.sp('mt', 2),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity',
                    )}
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
              </>
            ) : (
              <div className={cm.flex({ direction: 'col', align: 'start', gap: 'md' })}>
                <span
                  className={cm.cn(
                    'grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success material-symbols-outlined text-[24px]',
                  )}
                  aria-hidden="true"
                >
                  mark_email_read
                </span>
                <div>
                  <p className={cm.cn('text-base font-extrabold text-on-surface')}>
                    {t('common.checkYourInbox', {}, { defaultValue: 'Check your inbox' })}
                  </p>
                  <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                    {t(
                      'forgotPassword.successBody',
                      {},
                      {
                        defaultValue:
                          'If an account exists for that address, a reset link is on its way. Links expire in 30 minutes.',
                      },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </button>
              </div>
            )}
          </div>

          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link to="/login" className={cm.cn('font-bold text-primary hover:underline')}>
              ← {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

interface FieldProps {
  id: string
  type: string
  label: string
  placeholder: string
  icon: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}

function Field({
  id,
  type,
  label,
  placeholder,
  icon,
  value,
  onChange,
  autoComplete,
  required,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'flex items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[20px] text-on-surface-variant"
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={cm.cn(
            cm.sp('ml', 3),
            'flex-1 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}
