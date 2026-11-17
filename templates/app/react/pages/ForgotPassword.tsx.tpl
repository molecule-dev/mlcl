import { useState } from 'react'
import { useNavigate } from 'react-router'
import { usePasswordReset, useTranslation } from '@molecule/app-react'
import { Button } from '@molecule/app-ui-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { FloatingInput } from '../components/FloatingInput.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestStatus, requestError, requestReset } = usePasswordReset()
  const [email, setEmail] = useState('')
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
    <section className={cm.authPageBody}>
      {/* Screen-reader-only page heading — every page needs exactly one h1
            (axe page-has-heading-one); the visual design has no heading. */}
      <h1 className={cm.srOnly}>{t('auth.login.forgotPassword')}</h1>
      <div className={cm.authFormWrapper}>
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
            {requestError && (
              <div className={cm.authFormError} role="alert">
                {requestError.message}
              </div>
            )}
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
    </section>
  )
}
