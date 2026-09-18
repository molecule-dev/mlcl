import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
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

  if (sent)
    return (
      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'flex-grow relative z-10',
        )}
      >
        <div
          data-mol-id="forgot-sent"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('p', 8),
            'w-full max-w-[440px] glass-card ambient-glow rounded-lg md:p-10',
          )}
        >
          <p
            role="status"
            className={cm.cn(cm.textCenter, cm.sp('mb', 6), 'text-on-surface-variant')}
          >
            {t('forgotPassword.sent', {}, { defaultValue: 'Check your email for a reset link.' })}
          </p>
          <Link
            className={cm.cn('text-sm font-bold text-tertiary hover:underline transition-all')}
            to="/login"
          >
            {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
          </Link>
        </div>
      </main>
    )

  return (
    <div
      className={cm.cn(
        'bg-surface font-body text-on-surface min-h-screen flex flex-col relative overflow-hidden',
      )}
    >
      {/* Background Decorative Orbs (The "Neural Nodes") */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-tertiary-container neural-orb',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-secondary-container neural-orb',
        )}
      ></div>
      {/* Main Content */}
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
            cm.sp('p', 8),
            'w-full max-w-[440px] glass-card ambient-glow rounded-lg md:p-10',
          )}
        >
          {/* Logo Section */}
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 8), 'gap-2 group')}>
            <div
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'bg-gradient-to-tr from-primary to-secondary text-white shadow-lg',
              )}
            >
              <span
                className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                data-icon="auto_awesome"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </div>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('2xl'),
                'font-headline tracking-tight text-primary',
              )}
            >
              {APP_NAME}
            </span>
          </div>
          {/* Header */}
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 2),
                'font-headline font-extrabold text-on-background tracking-tight',
              )}
            >
              {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
            </h1>
            <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
              {t(
                'forgotPassword.subtitle',
                {},
                { defaultValue: "Enter your email and we'll send you a reset link." },
              )}
            </p>
          </div>
          {/* Form */}
          <form className={cm.cn(cm.w('full'), cm.stack(6))} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={cm.stack(2)}>
              <label
                htmlFor="forgot-email"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('ml', 1),
                  'block text-on-surface-variant',
                )}
              >
                {t('forgotPassword.emailLabel', {}, { defaultValue: 'Email Address' })}
              </label>
              <div className={cm.cn('relative')}>
                <input
                  id="forgot-email"
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    'bg-surface-container-high border-0 rounded-DEFAULT py-3.5 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300',
                  )}
                  placeholder={t(
                    'auth.passwordPlaceholderNameCompany',
                    {},
                    { defaultValue: 'name@company.com' },
                  )}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-invalid={!!error}
                />
              </div>
            </div>
            {/* CTA Button */}
            {error && (
              <div
                role="alert"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.textCenter,
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  'bg-error-container text-on-error-container',
                )}
              >
                {error}
              </div>
            )}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 4),
                cm.sp('px', 6),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                cm.sp('mt', 2),
                'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60',
              )}
              type="submit"
              disabled={loading}
            >
              {t('auth.forgotPassword.sendResetLink', {}, { defaultValue: 'Send reset link' })}
            </button>
          </form>
          {/* Footer Link */}
          <p
            className={cm.cn(
              cm.sp('mt', 10),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            {t('forgotPassword.rememberPassword', {}, { defaultValue: 'Remember your password?' })}{' '}
            <Link
              className={cm.cn('text-primary font-bold hover:underline underline-offset-4 ml-1')}
              to="/login"
            >
              {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
            </Link>
          </p>
        </div>
      </main>
      {/* Shared Component Footer */}
      <footer className={cm.cn('relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.sp('py', 8),
            cm.mxAuto,
            'md:flex-row w-full max-w-7xl gap-4',
          )}
        >
          <div
            className={cm.cn(
              cm.textSize('sm'),
              "text-cyan-700 dark:text-cyan-400 font-['Inter'] tracking-normal",
            )}
          >
            {t(
              'forgotPassword.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} AI. Built for the cognitive atmosphere.' },
            )}
          </div>
          <div className={cm.cn(cm.flex({}), 'gap-6')}>
            <LegalModalLinks
              linkClassName={cm.cn(
                "text-foreground-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-['Inter'] text-sm",
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
            <Link
              className={cm.cn(
                "text-foreground-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-['Inter'] text-sm",
              )}
              to="/help"
            >
              {t('common.helpCenter', {}, { defaultValue: 'Help Center' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
