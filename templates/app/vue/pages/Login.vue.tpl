<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-vue'
import { useAuth, useLocation, useLogin, useRouter, useTranslation } from '@molecule/app-vue'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { FloatingInput } from '../components/FloatingInput.js'
{{#feature footer}}
import Footer from '../components/Footer.vue'
{{/feature}}
{{#feature oauth}}
import OAuthButtons from '../components/OAuthButtons.vue'
{{/feature}}
import { ThemeToggle } from '../components/ThemeToggle.js'

const cm = getClassMap()
const { t } = useTranslation()
const { navigate } = useRouter()
const location = useLocation()
const from = computed(() => {
  const state = location.value.state as { from?: { pathname: string } } | null | undefined
  return state?.from?.pathname || '/'
})
const { status, login } = useLogin()
const { isAuthenticated } = useAuth()
const email = ref('')
const password = ref('')
{{#feature two-factor}}
const twoFactorToken = ref('')
{{/feature}}

const isLoggingIn = computed(() => status.value === 'pending')

// Route into the app whenever a session exists — covers the OAuth callback
// completing on this page (its exchange sets auth state without a submit)
// and an already-authenticated user landing on /login directly.
watch(
  [isAuthenticated, from],
  ([authenticated, target]) => {
    if (authenticated) navigate(target, { replace: true })
  },
  { immediate: true },
)

{{#feature two-factor}}
// The 2FA field is always rendered; only send a token when the user
// typed one (a 2FA-enabled account gets `twoFactorRequired` back and
// stays on this page until a valid code is entered).
async function handleSubmit(): Promise<void> {
  const result = await login({
    email: email.value,
    password: password.value,
    ...(twoFactorToken.value.trim() ? { twoFactorToken: twoFactorToken.value.trim() } : {}),
  })
  if (result.twoFactorRequired) return
  navigate(from.value, { replace: true })
}
{{/feature}}
{{^feature two-factor}}
async function handleSubmit(): Promise<void> {
  await login({ email: email.value, password: password.value })
  navigate(from.value, { replace: true })
}
{{/feature}}
</script>

<template>
  <div :class="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
    <header :class="cm.cn(cm.headerBar, cm.headerFixed)">
      <div :class="cm.authHeaderInner">
        <Flex align="center" justify="between" :class="cm.h('full')">
          <Flex align="center" gap="xs">
            <img
              src="/logo.svg"
              :width="LOGO_SIZE"
              :height="LOGO_SIZE"
              alt=""
              :class="cm.logoIcon"
            />
            <span :class="cm.logoText">{{ APP_NAME }}</span>
          </Flex>
          <ThemeToggle />
        </Flex>
      </div>
    </header>
    <main :class="cm.authPageBody">
      <!-- Screen-reader-only page heading — every page needs exactly one h1
          (axe page-has-heading-one); the visual design has no heading. -->
      <h1 :class="cm.srOnly">{{ t('auth.login.logIn') }}</h1>
      <div :class="cm.authFormWrapper">
        <!-- A rejected submit renders an accessible server-error list and a new
            submit clears the previous failure; the fieldset is disabled while
            the handler runs (all of that is the shared Form's job). -->
        <Form @form-submit="handleSubmit">
          <div :class="cm.authField">
            <FloatingInput
              :value="email"
              type="email"
              autocomplete="email"
              required
              :placeholder="t('auth.login.email')"
              @change="email = ($event.target as HTMLInputElement).value"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              :value="password"
              type="password"
              autocomplete="current-password"
              required
              :placeholder="t('auth.login.password')"
              @change="password = ($event.target as HTMLInputElement).value"
            />
          </div>
{{#feature two-factor}}
          <div :class="cm.authField">
            <FloatingInput
              :value="twoFactorToken"
              type="number"
              autocomplete="one-time-code"
              :placeholder="t('auth.login.twoFactor')"
              @change="twoFactorToken = ($event.target as HTMLInputElement).value"
            />
          </div>
{{/feature}}
          <div :class="cm.authButtonRow">
            <Button
              type="button"
              size="lg"
              :class="isLoggingIn ? cm.authHidden : cm.authLoginSignup"
              :disabled="isLoggingIn"
              @click="navigate('/signup')"
            >
              {{ t('auth.login.signUp') }}
            </Button>
            <Button
              type="submit"
              size="lg"
              color="success"
              :class="isLoggingIn ? cm.authLoginSubmitFull : cm.authLoginSubmit"
              :disabled="isLoggingIn"
            >
              {{ isLoggingIn ? t('auth.login.loggingIn') : t('auth.login.logIn') }}
            </Button>
          </div>
        </Form>
{{#feature emails}}
        <div :class="cm.authAfterSubmit">
          <button
            type="button"
            :class="cm.forgotPasswordLink"
            @click="navigate('/forgot-password')"
          >
            {{ t('auth.login.forgotPassword') }}
          </button>
        </div>
{{/feature}}
{{#feature oauth}}
        <OAuthButtons />
{{/feature}}
      </div>
    </main>
{{#feature footer}}
    <Footer />
{{/feature}}
  </div>
</template>
