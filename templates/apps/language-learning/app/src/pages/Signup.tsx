import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { OAuthButtons } from '../components/OAuthButtons.js'

const POPULAR_LANGUAGES = [
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'it', flag: '🇮🇹', name: 'Italian' },
] as const

export function Signup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, error, signup } = useSignup()
  // Cross-view auth form persistence via the shared @molecule hook: the
  // non-secret identity fields (email, name) are shared across the auth
  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets
  // (password) are deliberately kept in LOCAL state, never shared — see
  // useAuthFormState's docs for the rationale.
  const {
    fields: authFormFields,
    setField: setAuthFormField,
    clear: clearAuthForm,
  } = useAuthFormState()
  const email = authFormFields.email ?? ''
  const setEmail = (value: string): void => setAuthFormField('email', value)
  const name = authFormFields.name ?? ''
  const setName = (value: string): void => setAuthFormField('name', value)
  const [password, setPassword] = useState('')
  const [targetLang, setTargetLang] = useState<string>('es')

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      // Persist the chosen target language so the backend (and future
      // sessions) honor it. Non-blocking — if the PATCH fails, signup
      // still succeeded; the user can re-pick from /settings later.
      getHttpClient()
        .patch('/api/users/me/preferences', { target_languages: [targetLang] })
        .catch(() => {})
      navigate('/dashboard', { replace: true })
    } catch (_error) {
      // Error tracked in hook state; no additional logging needed.
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-gradient-to-br from-primary-container/60 via-background to-surface text-on-surface font-body relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('p', 6),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              'rounded-3xl bg-surface-container-lowest shadow-2xl shadow-primary/10 border border-outline-variant/30',
            )}
          >
            <AuthBrandHeader />

            <div className={cm.cn(cm.textCenter)}>
              <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                {t('signup.heading', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'signup.subheading',
                  {},
                  { defaultValue: 'Start a 7-day streak in under a minute.' },
                )}
              </p>
            </div>

            <form
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              onSubmit={handleSubmit}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="name"
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-2xl py-3.5 ring-2 ring-transparent focus-within:ring-primary transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-primary',
                    )}
                    aria-hidden="true"
                  >
                    person
                  </span>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(
                      'signup.namePlaceholder',
                      {},
                      { defaultValue: 'How should we greet you?' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/60',
                    )}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="email"
                >
                  {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-2xl py-3.5 ring-2 ring-transparent focus-within:ring-primary transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-primary',
                    )}
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t(
                      'auth.passwordPlaceholderNameExample',
                      {},
                      { defaultValue: 'name@example.com' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/60',
                    )}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="password"
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </label>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('px', 4),
                    'bg-surface-container-low rounded-2xl py-3.5 ring-2 ring-transparent focus-within:ring-primary transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('mr', 3),
                      cm.textSize('xl'),
                      'material-symbols-outlined text-primary',
                    )}
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(
                      'signup.passwordPlaceholder',
                      {},
                      { defaultValue: 'Eight characters or more' },
                    )}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 0),
                      cm.fontWeight('medium'),
                      'bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/60',
                    )}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.sp('ml', 1),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'signup.targetLanguageLabel',
                    {},
                    { defaultValue: 'Pick a language to start' },
                  )}
                </span>
                <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-3')}>
                  {POPULAR_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      aria-pressed={targetLang === lang.code}
                      onClick={() => setTargetLang(lang.code)}
                      className={cm.cn(
                        cm.sp('p', 3),
                        cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                        'rounded-2xl border-2 transition-all',
                        targetLang === lang.code
                          ? 'border-primary bg-primary-container/40 text-primary'
                          : 'border-outline-variant/40 hover:border-primary',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('2xl'))} aria-hidden="true">
                        {lang.flag}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                        {t(`signup.lang.${lang.code}`, {}, { defaultValue: lang.name })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'bg-error-container text-on-error-container rounded-2xl',
                  )}
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSigningUp}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  cm.fontWeight('bold'),
                  'bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60',
                )}
              >
                {isSigningUp
                  ? t('signup.submitting', {}, { defaultValue: 'Creating account…' })
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
            </form>

            <OAuthButtons />
          </div>

          <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'signup.haveAccount',
                { appName: APP_NAME },
                { defaultValue: 'Already on {{appName}}?' },
              )}{' '}
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textPrimary,
                  'hover:underline decoration-2 underline-offset-4 ml-1',
                )}
              >
                {t('signup.signIn', {}, { defaultValue: 'Sign in →' })}
              </Link>
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </div>
  )
}
