import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { loadContent } from '../config.js'

const submitGradient = 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'

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
        'bg-background font-body text-on-surface',
      )}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
            )}
          >
            <AuthBrandHeader />

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
                    className="material-symbols-outlined text-on-primary text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div>
                  <h2
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'font-headline',
                    )}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t('common.checkYourEmail', {}, { defaultValue: 'Check your email.' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                    {t(
                      'common.weSentAPasswordResetLink',
                      { email },
                      { defaultValue: 'We sent a password reset link to {{email}}.' },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className={'font-bold text-sm hover:underline'}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('auth.backToSignIn', {}, { defaultValue: 'Back to sign in' })}
                </button>
              </div>
            ) : (
              <>
                <div className={cm.textCenter}>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'font-headline text-on-surface',
                    )}
                  >
                    {t('auth.resetPassword.title', {}, { defaultValue: 'Reset your password' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'auth.forgotPassword.enterEmailDescription',
                      {},
                      { defaultValue: 'Enter your email and we will send you a reset link.' },
                    )}
                  </p>
                </div>
                <form
                  className={cm.cn(cm.flex({ direction: 'col' }), 'gap-5')}
                  onSubmit={handleSubmit}
                >
                  <div>
                    <label
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.sp('mb', 2),
                        'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em] font-label',
                      )}
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
                        'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
                      )}
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t(
                        'forgotPassword.emailPlaceholder',
                        {},
                        { defaultValue: 'patient@solace.health' },
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
                      cm.sp('mt', 2),
                      cm.textSize('base'),
                      cm.fontWeight('bold'),
                      'rounded-xl text-on-primary font-headline hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
                    )}
                    style={{ background: submitGradient }}
                  >
                    {isSubmitting
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('forgotPassword.submit', {}, { defaultValue: 'Send Reset Link' })}
                  </button>
                </form>
              </>
            )}
          </div>

          {!submitted && (
            <footer
              className={cm.cn(
                cm.sp('mt', 12),
                cm.flex({ direction: 'col', align: 'center' }),
                'gap-4',
              )}
            >
              <div
                className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-2')}
              >
                <LegalModalLinks
                  linkClassName={
                    'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest hover:text-primary transition-colors'
                  }
                  appName={APP_NAME}
                  loadContent={loadContent}
                  privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                  termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
                />
                <span className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">
                  {t('forgotFooter.hipaa', {}, { defaultValue: 'HIPAA Compliant' })}
                </span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'auth.login.rememberedYourPassword',
                  {},
                  { defaultValue: 'Remembered your password?' },
                )}{' '}
                <Link
                  to="/login"
                  className={'font-bold hover:underline decoration-2 underline-offset-4 ml-1'}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('forgotPassword.signIn', {}, { defaultValue: 'Sign In' })}
                </Link>
              </p>
            </footer>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
