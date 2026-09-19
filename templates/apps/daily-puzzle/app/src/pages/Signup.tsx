import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { useSignup, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { LexletLogo } from '../components/LexletLogo.js'
import { OAuthButtons } from '../components/OAuthButtons.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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

  const isSigningUp = status === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup({ email, password, name: name || undefined })
      clearAuthForm()
      navigate('/play', { replace: true })
    } catch (_error) {
      // Error tracked in hook state (status/error from useAuth); no additional handling needed
    }
  }

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased flex flex-col')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
        )}
      >
        <Link to="/" aria-label={`${APP_NAME} home`}>
          <LexletLogo size="md" />
        </Link>
        <ThemeToggle />
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
        )}
      >
        <div
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] w-full bg-surface-container-lowest border border-outline-variant/20 shadow-2xl shadow-primary/10',
            cm.maxW('md'),
            cm.sp('p', 10),
          )}
        >
          <span
            className={cm.cn(
              'absolute -top-24 -right-24 w-56 h-56 rounded-full bg-amber-300/25 blur-3xl',
            )}
            aria-hidden="true"
          />
          <span
            className={cm.cn(
              'absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-primary/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container/40 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest',
                cm.sp('mb', 5),
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                bolt
              </span>
              {t('signup.eyebrow', {}, { defaultValue: 'Free forever — one word a day' })}
            </span>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-2',
              )}
            >
              {t('signup.headline', {}, { defaultValue: 'Start your streak.' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
              {t(
                'signup.subhead',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Create a {{appName}} account to play the daily word, build a streak, and climb the leaderboard.',
                },
              )}
            </p>

            <form onSubmit={handleSubmit} className={cm.stack(4)}>
              <FloatingInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder={t('form.displayName', {}, { defaultValue: 'Display name' })}
              />
              <FloatingInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              />
              <FloatingInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                placeholder={t('auth.login.password', {}, { defaultValue: 'Password' })}
              />
              <button
                type="submit"
                disabled={isSigningUp}
                className={cm.cn(
                  'w-full inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-primary to-tertiary text-white font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.01] transition-transform disabled:opacity-60',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  rocket_launch
                </span>
                {isSigningUp
                  ? t(
                      'common.creatingYourAccountEllipsis',
                      {},
                      { defaultValue: 'Creating your account…' },
                    )
                  : t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
              </button>
              {error ? (
                <p className={cm.cn('text-xs font-semibold text-error text-center')}>
                  {error.message}
                </p>
              ) : null}
            </form>

            <div
              className={cm.cn(
                'flex items-center gap-3 text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                cm.sp('my', 6),
              )}
            >
              <span className={cm.cn('flex-1 h-px bg-outline-variant/40')} />
              {t('auth.signup.or', {}, { defaultValue: 'or sign up with' })}
              <span className={cm.cn('flex-1 h-px bg-outline-variant/40')} />
            </div>

            <OAuthButtons />

            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.textCenter,
                cm.sp('mt', 6),
                'text-on-surface-variant',
              )}
            >
              {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}{' '}
              <Link to="/login" className={cm.cn('font-extrabold text-primary hover:underline')}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Signup
