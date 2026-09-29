import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { loadContent } from '../config.js'
function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const inputCls = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    'block rounded-[12px] border-0 bg-surface-container-low text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )
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
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/users/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPassword.error', {}, { defaultValue: 'Could not send reset email' }),
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w('full'),
          cm.minH('screen'),
          'bg-gradient-to-br from-surface via-surface-container-low to-primary-container/20 font-body text-on-surface antialiased overflow-hidden',
        )}
      >
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 6),
            'flex-grow relative z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('p', 10),
              cm.w('full'),
              'glass-card max-w-[440px] rounded-[12px]',
            )}
          >
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 8), cm.w('full'))}>
              <h1
                className={cm.cn(
                  cm.flex({ justify: 'center' }),
                  cm.sp('mb', 2),
                  'font-headline font-black text-primary tracking-tighter',
                )}
              >
                <BrandWordmark as="span" size="lg" />
              </h1>
            </div>
            <p
              data-mol-id="forgot-sent"
              className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('forgotPassword.sent', {}, { defaultValue: 'Check your email for a reset link.' })}
            </p>
            <Link
              className={cm.cn(
                'mt-6 font-semibold text-primary hover:text-primary-container transition-colors text-sm',
              )}
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.w('full'),
        cm.minH('screen'),
        'bg-gradient-to-br from-surface via-surface-container-low to-primary-container/20 font-body text-on-surface antialiased overflow-hidden',
      )}
    >
      {/* Top Navigation Suppressed: Transactional Screen (Login) */}
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 10),
            cm.w('full'),
            'glass-card max-w-[440px] rounded-[12px]',
          )}
        >
          {/* Header */}
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8), cm.w('full'))}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 2),
                'font-headline font-bold text-on-surface tracking-tight',
              )}
            >
              {t('forgotPassword.title', {}, { defaultValue: 'Reset Password' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: 'Enter your email to receive a reset link' },
              )}
            </p>
          </div>
          {/* Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(5))} onSubmit={handleSubmit}>
            {/* Email */}
            <div className={cm.stack(1)}>
              <label
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'block font-label text-[11px] uppercase tracking-[0.05em] text-on-surface-variant',
                )}
                htmlFor="email"
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <div className="relative">
                <input
                  autoComplete="email"
                  className={inputCls}
                  id="email"
                  name="email"
                  required={true}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className={cm.textSize('xs')}
                style={{ color: 'var(--color-error, #ef4444)' }}
              >
                {error}
              </p>
            )}
            {/* Submit Button */}
            <div className={cm.sp('pt', 2)}>
              <button
                className={cm.cn(
                  cm.flex({ justify: 'center' }),
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'btn-gradient rounded-[12px] text-on-primary shadow-sm hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 hover:shadow-[0_8px_32px_rgba(26,26,46,0.12)] active:scale-[0.98]',
                )}
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
              </button>
            </div>
          </form>
          {/* Footer Link */}
          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <Link
              className={cm.cn(
                'font-semibold text-primary hover:text-primary-container transition-colors',
              )}
              to="/login"
            >
              {t('forgotPassword.backToSignIn', {}, { defaultValue: 'Back to Sign In' })}
            </Link>
          </p>
        </div>
      </main>
      {/* Footer Component */}
      <footer
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          cm.w('full'),
          cm.fontWeight('medium'),
          "fixed bottom-0 opacity-60 bg-transparent text-primary font-['Inter'] text-[11px] uppercase tracking-[0.05em] z-10 pointer-events-none",
        )}
      >
        <div>
          {t(
            'footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} Visualization. Precision Crafted.' },
          )}
        </div>
        <div className={cm.cn(cm.flex({ gap: 6 }), 'pointer-events-auto')}>
          <LegalModalLinks
            linkClassName={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <span className={cm.cn('text-on-surface-variant transition-colors')}>
            {t('footer.systemStatus', {}, { defaultValue: 'System Status' })}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
