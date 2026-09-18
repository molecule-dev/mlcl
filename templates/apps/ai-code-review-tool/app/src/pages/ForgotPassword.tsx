// Refract forgot-password — POLISHED-PATTERN-CATALOG §13 (auth).
// Pattern source: api-documentation Login, narrowed to single email field
// per screen-map.json derivation notes.
import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`

const gridBackground = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

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
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = e.target as HTMLFormElement
    const formData = new FormData(target)
    const submittedEmail = (formData.get('email') as string | null) || email
    if (!submittedEmail) return
    setLoading(true)
    setError(null)
    setSent(true)
    try {
      await http.post('/api/users/forgot-password', { email: submittedEmail }).catch(() => null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-dark)', color: 'var(--color-auth-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.16 }}
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
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            <AuthBrandHeader
              subtitle={t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            />

            {sent ? (
              <div
                data-mol-id="forgot-sent"
                className={cm.cn(cm.textCenter, cm.stack(4), cm.sp('p', 4), 'rounded-lg')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 13%, transparent)',
                  color: 'var(--color-auth-text)',
                }}
                aria-live="polite"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  mark_email_read
                </span>
                <p className={cm.textSize('sm')}>
                  {t(
                    'forgotPassword.sent',
                    {},
                    { defaultValue: 'If that email is registered, a reset link has been sent.' },
                  )}
                </p>
              </div>
            ) : null}

            <p
              className={cm.cn(cm.textSize('sm'), cm.textCenter, 'leading-relaxed')}
              style={{ color: 'var(--color-auth-muted)' }}
            >
              {t(
                'forgotPassword.helper',
                {},
                { defaultValue: 'Enter your email to receive a reset link.' },
              )}
            </p>

            <form className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')} onSubmit={handleSubmit}>
              <div>
                <label
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'block text-[0.6875rem] tracking-[0.05em] font-mono uppercase',
                  )}
                  style={{ color: 'var(--color-auth-muted)' }}
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
                    'rounded-lg transition-all font-mono',
                  )}
                  style={{
                    backgroundColor: 'var(--color-auth-input)',
                    border: '1px solid var(--color-auth-border)',
                    color: 'var(--color-auth-text)',
                  }}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t(
                    'forgotPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'developer@example.com' },
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                    color: 'var(--color-on-error-container)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-mol-id="forgot-submit"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.sp('mt', 2),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                )}
                style={{ background: submitGradient }}
              >
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
              </button>
            </form>
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <Link
              to="/login"
              className={cm.cn('font-bold hover:underline decoration-2 underline-offset-4 text-sm')}
              style={{ color: 'var(--color-auth-link)' }}
            >
              {t('forgotPassword.backToLogin', {}, { defaultValue: 'Back to Sign In' })}
            </Link>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword as ForgotPasswordPage }
