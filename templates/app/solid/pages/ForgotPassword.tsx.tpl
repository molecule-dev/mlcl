import { createSignal, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { createPasswordReset, useTranslate } from '@molecule/app-solid'
import { Button, Flex } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '../components/Icon.js'
import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function ForgotPassword() {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const { requestState, requestReset } = createPasswordReset()
  const [email, setEmail] = createSignal('')
  const [submitted, setSubmitted] = createSignal(false)
  const [message, setMessage] = createSignal('')

  const isSubmitting = () => requestState().status === 'pending'

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    try {
      await requestReset({ email: email() })
      setMessage(t('auth.forgotPassword.success'))
      setSubmitted(true)
    } catch {
      // Error tracked in hook state
    }
  }

  return (
    <div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div class={cm.authHeaderInner}>
          <Flex align="center" justify="between" className={cm.h('full')}>
            <Flex align="center" gap="xs">
              <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" class={cm.logoIcon} />
              <span class={cm.logoText}>{APP_NAME}</span>
            </Flex>
            <ThemeToggle />
          </Flex>
        </div>
      </header>
      <div class={cm.authPageBody}>
        <div class={cm.authFormWrapper}>
          <Show
            when={!submitted()}
            fallback={
              <div>
                <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.authField)}>{message()}</p>
                <div class={cm.authButtonRow}>
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
                    <Icon name="arrow-right" size={20} class={cm.sp('ml', 1)} />
                  </Button>
                </div>
              </div>
            }
          >
            <form onSubmit={handleSubmit}>
              <div class={cm.authField}>
                <FloatingInput
                  id="email"
                  type="email"
                  value={email()}
                  onInput={(e: InputEvent) =>
                    setEmail((e.currentTarget as HTMLInputElement).value)
                  }
                  autocomplete="email"
                  autofocus
                  required
                  placeholder={t('auth.forgotPassword.email')}
                />
              </div>
              <div class={cm.authButtonRow}>
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
                  disabled={isSubmitting()}
                >
                  {isSubmitting() ? t('auth.forgotPassword.submitting') : t('common.submit')}
                </Button>
              </div>
            </form>
          </Show>
          <Show when={requestState().error}>
            <div class={cm.authFormError}>
              {(requestState().error as Error)?.message}
            </div>
          </Show>
        </div>
      </div>
      <Footer />
    </div>
  )
}
