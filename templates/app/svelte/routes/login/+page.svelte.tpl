<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/stores'
  import type { RouteIdWithSearchOrHash } from '$app/types'
  import { APP_NAME, LOGO_SIZE } from '$lib/branding.js'

  import { createAuthStores, createI18nStores, createLoginStore } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, Form } from '@molecule/app-ui-svelte'

  import FloatingInput from '../../components/FloatingInput.svelte'
  import Footer from '../../components/Footer.svelte'
  import OAuthButtons from '../../components/OAuthButtons.svelte'
  import ThemeToggle from '../../components/ThemeToggle.svelte'
  import { LOGO_SRC } from '../../lib/logo.js'

  const cm = getClassMap()
  const { t } = createI18nStores()
  // Post-login restoration: the auth guard stashes the attempted location in
  // history state (`state.from`) before redirecting here. The state was
  // written by our own guard from a real pathname, so it names a route.
  const from = $derived(
    ($page.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/',
  )
  const loginStore = createLoginStore()
  const { isAuthenticated } = createAuthStores()

  let email = $state('')
  let password = $state('')
  let twoFactorToken = $state('')

  // Route into the app whenever a session exists — covers the OAuth callback
  // completing on this page (its exchange sets auth state without a submit)
  // and an already-authenticated user landing on /login directly.
  $effect(() => {
    if ($isAuthenticated) goto(resolve(from as RouteIdWithSearchOrHash), { replaceState: true })
  })

  let isLoggingIn = $derived($loginStore.status === 'pending')

  async function handleSubmit(): Promise<void> {
    // The 2FA field is always rendered; only send a token when the user
    // typed one (a 2FA-enabled account gets `twoFactorRequired` back and
    // stays on this page until a valid code is entered).
    const result = await loginStore.call({
      email,
      password,
      ...(twoFactorToken.trim() ? { twoFactorToken: twoFactorToken.trim() } : {}),
    })
    if (result.twoFactorRequired) return
    goto(resolve(from as RouteIdWithSearchOrHash), { replaceState: true })
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
    <h1 class={cm.srOnly}>{$t('auth.login.logIn')}</h1>
    <div class={cm.authFormWrapper}>
      <Form onFormSubmit={handleSubmit}>
        <div class={cm.authField}>
          <FloatingInput
            type="email"
            bind:value={email}
            autocomplete="email"
            required
            placeholder={$t('auth.login.email')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="password"
            bind:value={password}
            autocomplete="current-password"
            required
            placeholder={$t('auth.login.password')}
          />
        </div>
        <div class={cm.authField}>
          <FloatingInput
            type="number"
            bind:value={twoFactorToken}
            autocomplete="one-time-code"
            placeholder={$t('auth.login.twoFactor')}
          />
        </div>
        <div class={cm.authButtonRow}>
          <Button
            type="button"
            size="lg"
            className={isLoggingIn ? cm.authHidden : cm.authLoginSignup}
            disabled={isLoggingIn}
            onClick={() => goto(resolve('/signup'))}
          >
            {$t('auth.login.signUp')}
          </Button>
          <Button
            type="submit"
            size="lg"
            color="success"
            className={isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? $t('auth.login.loggingIn') : $t('auth.login.logIn')}
          </Button>
        </div>
      </Form>
      <div class={cm.authAfterSubmit}>
        <button
          type="button"
          onclick={() => goto(resolve('/forgot-password'))}
          class={cm.forgotPasswordLink}
        >
          {$t('auth.login.forgotPassword')}
        </button>
      </div>
      <OAuthButtons />
    </div>
  </main>
  <Footer />
</div>
