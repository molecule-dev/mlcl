<script lang="ts">
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  import { useNavigate, usePasswordReset, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, FloatingInput, Icon, ThemeToggle } from '@molecule/app-ui-svelte'

  import Footer from '../../components/Footer.svelte'
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestStatus, requestError, requestReset } = usePasswordReset()

  let email = $state('')
  let submitted = $state(false)
  let message = $state('')

  const isSubmitting = $derived($requestStatus === 'pending')

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    try {
      await requestReset({ email })
      message = t('auth.forgotPassword.success')
      submitted = true
    } catch (_error) {
      // Error tracked in hook state
    }
  }
</script>

<div class={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
  <header class={cm.cn(cm.headerBar, cm.headerFixed)}>
    <div class={cm.authHeaderInner}>
      <Flex align="center" justify="between" className={cm.h('full')}>
        <Flex align="center" gap="xs">
          <img src={LOGO_SRC} width={LOGO_SIZE} height={LOGO_SIZE} alt="" class={cm.logoIcon} />
          <span class={cm.logoText}>{APP_NAME}</span>
        </Flex>
        <ThemeToggle />
      </Flex>
    </div>
  </header>
  <main class={cm.authPageBody}>
    <!-- Screen-reader-only page heading — every page needs exactly one h1
        (axe page-has-heading-one); the visual design has no heading. -->
    <h1 class={cm.srOnly}>{t('auth.login.forgotPassword')}</h1>
    <div class={cm.authFormWrapper}>
      {#if !submitted}
        <form onsubmit={handleSubmit}>
          <div class={cm.authField}>
            <FloatingInput
              type="email"
              value={email}
              onChange={(e) => (email = (e.target as HTMLInputElement).value)}
              autocomplete="email"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.forgotPassword.submitting') : t('common.submit')}
            </Button>
          </div>
        </form>
        {#if $requestError}
          <div class={cm.authFormError} role="alert">
            {$requestError.message}
          </div>
        {/if}
      {:else}
        <p class={cm.authField}>{message}</p>
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
            <Icon name="arrow-right" size={20} class={cm.authArrowIcon} />
          </Button>
        </div>
      {/if}
    </div>
  </main>
  <Footer />
</div>
