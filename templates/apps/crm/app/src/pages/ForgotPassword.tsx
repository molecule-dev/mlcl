import { useState } from 'react'
import { Link } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { openPrivacy, openTerms, modals } = useLegalModals({
    appName: APP_NAME,
    loadContent,
  })
  // Cross-view auth form persistence — the email typed here carries to
  // Reset Password (and back to Login/Signup). NOT cleared on submit so it
  // survives the navigation to the reset view.
  const { fields: authFormFields, setField: setAuthFormField } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
          : t('forgotPassword.sendError', {}, { defaultValue: 'Could not send reset email' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-background font-body text-on-surface antialiased',
      )}
    >
      {/* Hero Background Texture (Subtle Architectural Detail) */}
      <div className={cm.fv315d7cc2}>
        <div
          className={cm.cn(
            cm.roundedFull,
            'absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-fixed/20 blur-[120px]',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.roundedFull,
            'absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary-container/30 blur-[120px]',
          )}
        ></div>
      </div>
      <main
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 10),
          cm.w('full'),
          cm.maxW('md'),
          'relative z-10',
        )}
      >
        {/* Main Login Card */}
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest/80 backdrop-blur-xl rounded-xl md:p-12 shadow-[0_20px_40px_rgba(26,27,32,0.06)]',
          )}
        >
          {/* Brand Identity */}
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.sp('mb', 10))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(12),
                cm.h(12),
                cm.sp('mb', 6),
                'architect-gradient rounded-xl shadow-lg shadow-primary/20',
              )}
            >
              <span
                className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
                data-icon="architecture"
              >
                architecture
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                'font-extrabold tracking-tight text-on-surface font-headline uppercase',
              )}
            >
              {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                cm.fontWeight('medium'),
                'text-on-surface-variant tracking-wide',
              )}
            >
              {t('app.tagline', {}, { defaultValue: 'PRECISION ARCHITECTED DATA' })}
            </p>
          </div>
          {sent ? (
            <div data-mol-id="forgot-sent" className={cm.textCenter}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mb', 6),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'common.weSentAPasswordResetLink',
                  { email },
                  { defaultValue: 'We sent a password reset link to {{email}}.' },
                )}
              </p>
              <Link className={cm.fva7be000c} to="/login">
                {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  data-mol-id="forgot-password-error"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('xs'),
                    cm.textCenter,
                    cm.sp('mb', 4),
                    'bg-error-container text-on-error-container rounded-xl',
                  )}
                >
                  {error}
                </div>
              )}
              <form className={cm.stack(8)} onSubmit={handleSubmit}>
                <div className={cm.stack(6)}>
                  {/* Email Field */}
                  <div className={cm.fvdef3facc}>
                    <label
                      className={cm.cn(
                        cm.sp('mb', 2),
                        cm.sp('px', 1),
                        cm.fontWeight('bold'),
                        'block text-[10px] uppercase tracking-[0.05em] text-on-surface-variant',
                      )}
                      htmlFor="email"
                    >
                      {t('forgotPassword.email', {}, { defaultValue: 'Email Address' })}
                    </label>
                    <div className={cm.fvd683bc2b}>
                      <input
                        className={cm.cn(
                          cm.w('full'),
                          cm.sp('px', 4),
                          cm.sp('py', 4),
                          cm.textSize('sm'),
                          'bg-surface-container-lowest ghost-border rounded-xl text-on-surface placeholder:text-outline/50 transition-all duration-300 focus:ring-0 focus:border-primary border-transparent outline-none ring-0 appearance-none',
                        )}
                        id="email"
                        placeholder={t(
                          'auth.passwordPlaceholderNameCompany',
                          {},
                          { defaultValue: 'name@company.com' },
                        )}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <div className={cm.fv0a84f876}></div>
                    </div>
                  </div>
                </div>
                {/* Action Button */}
                <button
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    'architect-gradient text-white rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 active:scale-[0.98] tracking-tight',
                  )}
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? t('forgotPassword.sending', {}, { defaultValue: 'Sending...' })
                    : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
                </button>
              </form>
            </>
          )}
          {/* Bottom Redirect */}
          <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'forgotPassword.rememberPassword',
                {},
                { defaultValue: 'Remember your password?' },
              )}{' '}
              <Link className={cm.fv5e9a3b86} to="/login">
                {t('common.signIn', {}, { defaultValue: 'Sign In' })}
              </Link>
            </p>
          </div>
        </div>
        {/* Secondary Meta Links */}
        <div className={cm.cn(cm.sp('mt', 6), cm.flex({ justify: 'center' }), 'gap-6')}>
          {/* Decorative brand label (matches Login/Signup) — not a link; it
              previously opened the Terms modal, which was misleading */}
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-outline',
            )}
          >
            {t('nav.security', {}, { defaultValue: 'Security' })}
          </span>
          <button type="button" className={cm.fv8b754ad1} onClick={openPrivacy}>
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </button>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-outline',
            )}
            title={t('forgotPassword.versionHint', {}, { defaultValue: 'App version' })}
          >
            v2.4.0
          </span>
        </div>
      </main>
      {/* Shared Component: Footer */}
      <footer className={cm.cn(cm.w('full'), cm.sp('py', 6), 'mt-auto')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.w('full'),
            'max-w-7xl',
            cm.mxAuto,
            'md:flex-row',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              cm.sp('mb', 4),
              "uppercase tracking-widest text-foreground-tertiary font-['Inter'] md:mb-0",
            )}
          >
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}}. Precision Architected.' },
            )}
          </span>
          <div className={cm.cn(cm.flex({}), 'gap-8')}>
            <button type="button" className={cm.fv64c8657e} onClick={openPrivacy}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </button>
            <button type="button" className={cm.fv64c8657e} onClick={openTerms}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </button>
            {/* Decorative brand label (matches Signup's footer) — not a link */}
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                "uppercase tracking-widest text-foreground-tertiary font-['Inter']",
              )}
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </span>
          </div>
        </div>
      </footer>
      {modals}
    </div>
  )
}

export default ForgotPassword
export { ForgotPassword, ForgotPassword as ForgotPasswordPage }
