import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ForgotPassword() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.post('/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.sendError', {}, { defaultValue: 'Could not send reset email' }),
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-surface-container-lowest text-on-surface font-body relative overflow-hidden bg-terminal-pattern',
        )}
      >
        <div
          className={
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none'
          }
        ></div>
        <div className={cm.cn(cm.w('full'), cm.sp('mx', 4), 'max-w-[420px] relative z-10')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('4xl'),
                cm.sp('mb', 2),
                'font-headline tracking-tighter text-on-surface',
              )}
            >
              {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'font-label text-on-surface-variant/70 uppercase tracking-widest',
              )}
            >
              {t('forgotPassword.tagline', {}, { defaultValue: 'Agent development platform' })}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'bg-surface-container-low rounded-lg relative border border-outline-variant/15',
            )}
          >
            <div
              className={
                'absolute inset-0 bg-surface-variant/5 backdrop-blur-[24px] rounded-lg -z-10 pointer-events-none'
              }
            ></div>
            <p
              data-mol-id="forgot-sent"
              className={cm.cn(cm.textSize('sm'), cm.textCenter, 'font-body text-on-surface')}
            >
              {t('forgotPassword.sent', {}, { defaultValue: 'Check your email for a reset link.' })}
            </p>
          </div>
          <div className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
              {t(
                'auth.login.rememberedYourPassword',
                {},
                { defaultValue: 'Remembered your password?' },
              )}{' '}
              <Link
                className={
                  'font-label text-secondary hover:text-secondary-fixed transition-colors ml-1'
                }
                to="/login"
              >
                {t('forgotPassword.signIn', {}, { defaultValue: 'Sign in →' })}
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        'bg-surface-container-lowest text-on-surface font-body relative overflow-hidden bg-terminal-pattern',
      )}
    >
      {/* Ambient Glow Background */}
      <div
        className={
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none'
        }
      ></div>
      <div className={cm.cn(cm.w('full'), cm.sp('mx', 4), 'max-w-[420px] relative z-10')}>
        {/* Logo Section */}
        <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('4xl'),
              cm.sp('mb', 2),
              'font-headline tracking-tighter text-on-surface',
            )}
          >
            {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'font-label text-on-surface-variant/70 uppercase tracking-widest',
            )}
          >
            {t('forgotPassword.tagline', {}, { defaultValue: 'Agent development platform' })}
          </p>
        </div>
        {/* Login Card */}
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-low rounded-lg relative border border-outline-variant/15',
          )}
        >
          {/* Glassmorphism subtle overlay */}
          <div
            className={
              'absolute inset-0 bg-surface-variant/5 backdrop-blur-[24px] rounded-lg -z-10 pointer-events-none'
            }
          ></div>
          <form className={cm.stack(5)} onSubmit={handleSubmit}>
            <div className={cm.stack(4)}>
              {/* Email Input */}
              <div>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'block font-label text-on-surface-variant mb-1.5',
                  )}
                  htmlFor="email"
                >
                  {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email / Identifier' })}
                </label>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-lowest text-on-surface font-label rounded-lg border border-outline-variant/15 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-colors placeholder:text-on-surface-variant/40',
                  )}
                  id="email"
                  placeholder={t(
                    'forgotPassword.emailPlaceholder',
                    {},
                    { defaultValue: 'sysadmin@neuron.local' },
                  )}
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
              </div>
            </div>
            {error && (
              <p role="alert" className={cm.cn(cm.textSize('xs'), 'font-label text-error')}>
                {error}
              </p>
            )}
            {/* Send Reset Link Button */}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                'kinetic-gradient text-on-primary-fixed font-headline tracking-tight rounded-lg transition-all',
              )}
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
              </span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
        {/* Footer */}
        <div className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
          <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
            {t(
              'auth.login.rememberedYourPassword',
              {},
              { defaultValue: 'Remembered your password?' },
            )}{' '}
            <Link
              className={
                'font-label text-secondary hover:text-secondary-fixed transition-colors ml-1'
              }
              to="/login"
            >
              {t('forgotPassword.signIn', {}, { defaultValue: 'Sign in →' })}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
