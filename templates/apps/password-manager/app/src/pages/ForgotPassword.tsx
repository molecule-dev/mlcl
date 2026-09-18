import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SigilBrandHeader } from '../components/SigilBrandHeader.js'

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
      // error surfaced via requestError from usePasswordReset hook state
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-lg border border-primary-light/40 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.minH('screen'),
        'bg-surface-container-low/40 font-body text-on-surface',
      )}
    >
      <main className={cm.cn(cm.w('full'), cm.maxW('md'))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 8),
            'bg-surface rounded-2xl shadow-lg shadow-primary-light/40 border border-primary-light/30',
          )}
        >
          <SigilBrandHeader
            heading={
              submitted
                ? t('forgot.submittedHeading', {}, { defaultValue: 'Recovery instructions sent' })
                : t('forgot.heading', {}, { defaultValue: 'Recovery kit lookup' })
            }
            subhead={
              submitted
                ? t(
                    'forgot.submittedSubhead',
                    { email },
                    { defaultValue: 'Check {{email}} for the secure link to your Recovery Kit.' },
                  )
                : t(
                    'forgot.subhead',
                    {},
                    {
                      defaultValue:
                        'Since we never see your master password, we can only help you restore from your Recovery Kit.',
                    },
                  )
            }
          />

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={inputClass}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2',
                )}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {isSubmitting ? 'progress_activity' : 'send'}
                </span>
                {isSubmitting
                  ? t('forgot.sending', {}, { defaultValue: 'Sending...' })
                  : t('forgot.submit', {}, { defaultValue: 'Send recovery instructions' })}
              </button>
              {requestError && (
                <p className={cm.cn(cm.textSize('xs'), 'text-error text-center')}>
                  {requestError.message}
                </p>
              )}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.w('full'),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all active:scale-[0.98]',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_back
              </span>
              {t('forgot.backToLogin', {}, { defaultValue: 'Back to Sign In' })}
            </button>
          )}
        </div>

        <footer
          className={cm.cn(
            cm.sp('mt', 6),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          <Link to="/login" className={cm.cn('text-primary-dark font-bold hover:underline')}>
            {t('forgot.signInLink', {}, { defaultValue: 'Back to Sign In' })}
          </Link>
        </footer>
      </main>
    </div>
  )
}

export default ForgotPassword
