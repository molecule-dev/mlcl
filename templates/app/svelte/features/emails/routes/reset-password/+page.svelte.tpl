<script lang="ts">
  import { APP_NAME, LOGO_SIZE } from '#lib/branding.js'

  import {
    useLocation,
    useLogin,
    useNavigate,
    usePasswordReset,
    useTranslation,
  } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, FloatingInput, Icon, ThemeToggle } from '@molecule/app-ui-svelte'

  import Footer from '../../components/Footer.svelte'
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { confirmStatus, confirmError, confirmReset } = usePasswordReset()
  const { login } = useLogin()

  // The reset link carries its token and the address it was sent to in the
  // query; seed the fields from them once, the way React's useState
  // initializers do.
  const search = new URLSearchParams($location.search)
  let token = $state(search.get('token') || '')
  let email = $state(search.get('email') || '')
  let password = $state('')
{{#feature two-factor}}
  let twoFactorToken = $state('')
{{/feature}}

  const isLoggingIn = $derived($confirmStatus === 'pending')

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    try {
      await confirmReset({ token, password })
{{#feature two-factor}}
      const result = await login({
        email,
        password,
        ...(twoFactorToken.trim() ? { twoFactorToken: twoFactorToken.trim() } : {}),
      })
      // An account with two-factor on and no code typed signs in on the login page, which asks for it.
      navigate(result.twoFactorRequired ? '/login' : '/', { replace: true })
{{/feature}}
{{^feature two-factor}}
      await login({ email, password })
      navigate('/', { replace: true })
{{/feature}}
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
    <h1 class={cm.srOnly}>{t('auth.resetPassword.submit')}</h1>
    <div class={cm.authFormWrapper}>
      <form onsubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            value={email}
            onChange={(e) => (email = (e.target as HTMLInputElement).value)}
            autocomplete="email"
            required
            placeholder={t('auth.resetPassword.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            value={token}
            onChange={(e) => (token = (e.target as HTMLInputElement).value)}
            required
            placeholder={t('auth.resetPassword.token')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            value={password}
            onChange={(e) => (password = (e.target as HTMLInputElement).value)}
            autocomplete="new-password"
            required
            placeholder={t('auth.resetPassword.newPassword')}
          />
        </div>
{{#feature two-factor}}
        <div class={cm.authField}>
          <FloatingInput
            type="number"
            value={twoFactorToken}
            onChange={(e) => (twoFactorToken = (e.target as HTMLInputElement).value)}
            autocomplete="one-time-code"
            placeholder={t('auth.resetPassword.twoFactor')}
          />
        </div>
{{/feature}}
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
            disabled={isLoggingIn}
          >
            {isLoggingIn ? t('auth.resetPassword.loggingIn') : t('auth.resetPassword.submit')}
          </Button>
        </div>
      </form>
      {#if $confirmError}
        <div class={cm.authFormError} role="alert">
          {$confirmError.message}
        </div>
      {/if}
    </div>
  </main>
  <Footer />
</div>
