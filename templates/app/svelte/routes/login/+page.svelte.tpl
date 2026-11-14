<script lang="ts">
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  import { useAuth, useLocation, useLogin, useNavigate, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, FloatingInput, Form, ThemeToggle } from '@molecule/app-ui-svelte'

  import Footer from '../../components/Footer.svelte'
  import OAuthButtons from '../../components/OAuthButtons.svelte'
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  // Post-login restoration: the auth guard stashes the attempted location in
  // history state (`state.from`) before redirecting here. The state was
  // written by the guard from a real location, so it names a route.
  const from = $derived(
    ($location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/',
  )
  const { status, login } = useLogin()
  const { isAuthenticated } = useAuth()

  let email = $state('')
  let password = $state('')
  let twoFactorToken = $state('')

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /login directly.
  $effect(() => {
    if ($isAuthenticated) navigate(from, { replace: true })
  })

  const isLoggingIn = $derived($status === 'pending')

  async function handleSubmit(): Promise<void> {
    // The 2FA field is always rendered; only send a token when the user
    // typed one (a 2FA-enabled account gets `twoFactorRequired` back and
    // stays on this page until a valid code is entered).
    const result = await login({
      email,
      password,
      ...(twoFactorToken.trim() ? { twoFactorToken: twoFactorToken.trim() } : {}),
    })
    if (result.twoFactorRequired) return
    navigate(from, { replace: true })
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
    <h1 class={cm.srOnly}>{t('auth.login.logIn')}</h1>
    <div class={cm.authFormWrapper}>
      <Form onFormSubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            value={email}
            onChange={(e) => (email = (e.target as HTMLInputElement).value)}
            autocomplete="email"
            required
            placeholder={t('auth.login.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            value={password}
            onChange={(e) => (password = (e.target as HTMLInputElement).value)}
            autocomplete="current-password"
            required
            placeholder={t('auth.login.password')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="number"
            value={twoFactorToken}
            onChange={(e) => (twoFactorToken = (e.target as HTMLInputElement).value)}
            autocomplete="one-time-code"
            placeholder={t('auth.login.twoFactor')}
          />
        </div>
        <div class={cm.authButtonRow}>
          <Button
            type="button"
            size="lg"
            className={isLoggingIn ? cm.authHidden : cm.authLoginSignup}
            disabled={isLoggingIn}
            onClick={() => navigate('/signup')}
          >
            {t('auth.login.signUp')}
          </Button>
          <Button
            type="submit"
            size="lg"
            color="success"
            className={isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? t('auth.login.loggingIn') : t('auth.login.logIn')}
          </Button>
        </div>
      </Form>
      <div class={cm.authAfterSubmit}>
        <button
          type="button"
          onclick={() => navigate('/forgot-password')}
          class={cm.forgotPasswordLink}
        >
          {t('auth.login.forgotPassword')}
        </button>
      </div>
      <OAuthButtons />
    </div>
  </main>
  <Footer />
</div>
