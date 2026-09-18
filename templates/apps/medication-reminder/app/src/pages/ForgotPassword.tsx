import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
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
  const [message, setMessage] = useState('')

  const isSubmitting = requestStatus === 'pending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestReset({ email })
      setMessage(t('auth.forgotPassword.success'))
      setSubmitted(true)
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header className={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div className={cm.authHeaderInner}>
          <Flex align="center" justify="between" className={cm.h('full')}>
            <Flex align="center" gap="xs">
              <img
                src="/logo.svg"
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                alt=""
                className={cm.logoIcon}
              />
              <span className={cm.logoText}>{APP_NAME}</span>
            </Flex>
            <ThemeToggle />
          </Flex>
        </div>
      </header>
      <div className={cm.authPageBody}>
        <div className={cm.authFormWrapper}>
          <AuthBrandHeader />
          <p
            className={cm.cn(
              cm.sp('mt', 6),
              cm.sp('mb', 4),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'auth.forgotPassword.subtitle',
              {},
              { defaultValue: 'Enter your email and we\u2019ll send you a reset link.' },
            )}
          </p>
          {!submitted ? (
            <>
              <form onSubmit={handleSubmit}>
                <div className={cm.authField}>
                  <FloatingInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    placeholder={t('auth.forgotPassword.email')}
                  />
                </div>
                <div className={cm.authButtonRow}>
                  <Button
                    type="button"
                    size="lg"
                    color="secondary"
                    className={cm.authBackButton}
                    onClick={() => navigate('/login')}
                    aria-label={t('common.goBack')}
                  >
                    <Icon name="arrow-left" size={25} />
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    color="success"
                    className={cm.authSubmitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('auth.forgotPassword.submitting') : t('common.submit')}
                  </Button>
                </div>
              </form>
              {requestError && <div className={cm.authFormError}>{requestError.message}</div>}
            </>
          ) : (
            <>
              <p className={cm.authField}>{message}</p>
              <div className={cm.authButtonRow}>
                <Button
                  type="button"
                  size="lg"
                  color="secondary"
                  className={cm.authBackButton}
                  onClick={() => navigate('/login')}
                  aria-label={t('common.goBack')}
                >
                  <Icon name="arrow-left" size={25} />
                </Button>
                <Button
                  size="lg"
                  color="success"
                  className={cm.authSubmitButton}
                  onClick={() => navigate('/reset-password')}
                >
                  {t('common.continue')}
                  <Icon name="arrow-right" size={20} className={cm.authArrowIcon} />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
