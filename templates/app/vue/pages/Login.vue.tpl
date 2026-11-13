<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-vue'
import { useAuth, useLogin, useTranslation } from '@molecule/app-vue'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import FloatingInput from '../components/FloatingInput.vue'
import Footer from '../components/Footer.vue'
import { formSubmitErrorMessages } from '../components/formSubmitError.js'
import OAuthButtons from '../components/OAuthButtons.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const route = useRoute()
const from = (route.query.from as string) || '/'
const { status, login } = useLogin()
const { isAuthenticated } = useAuth()
const email = ref('')
const password = ref('')
const twoFactorToken = ref('')

const isLoggingIn = computed(() => status.value === 'pending')

// Route into the app whenever a session exists — covers the OAuth callback
// completing on this page (its exchange sets auth state without a submit)
// and an already-authenticated user landing on /login directly.
watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) router.replace(from)
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  // The 2FA field is always rendered; only send a token when the user
  // typed one (a 2FA-enabled account gets `twoFactorRequired` back and
  // stays on this page until a valid code is entered).
  const result = await login({
    email: email.value,
    password: password.value,
    ...(twoFactorToken.value.trim() ? { twoFactorToken: twoFactorToken.value.trim() } : {}),
  })
  if (result.twoFactorRequired) return
  router.replace(from)
}

// Submission envelope ported from `@molecule/app-ui-react`'s `<Form>`: a
// rejected handler renders an accessible server-error list; a new submit
// clears the previous failure; the fieldset is disabled while the handler runs.
const failure = ref<unknown>(null)
const pending = ref(false)
let attempt = 0

async function onSubmit(): Promise<void> {
  const current = ++attempt
  failure.value = null
  pending.value = true
  try {
    await handleSubmit()
  } catch (submitError) {
    if (attempt === current) failure.value = submitError
  } finally {
    if (attempt === current) pending.value = false
  }
}

const errorMessages = computed(() =>
  failure.value
    ? formSubmitErrorMessages(
        failure.value,
        t('ui.form.submitError', undefined, {
          defaultValue: 'Unable to submit. Please try again.',
        }),
      )
    : [],
)
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
        <form @submit.prevent="onSubmit">
          <ul v-if="errorMessages.length > 0" role="alert" :class="cm.formError">
            <li v-for="(message, index) in errorMessages" :key="index">{{ message }}</li>
          </ul>
          <fieldset :disabled="pending" :class="cm.formFieldsetContents">
            <div :class="cm.authField">
              <FloatingInput
                v-model="email"
                type="email"
                auto-complete="email"
                required
                :placeholder="t('auth.login.email')"
              />
            </div>
            <div :class="cm.authField">
              <FloatingInput
                v-model="password"
                type="password"
                auto-complete="current-password"
                required
                :placeholder="t('auth.login.password')"
              />
            </div>
            <div :class="cm.authField">
              <FloatingInput
                v-model="twoFactorToken"
                type="number"
                auto-complete="one-time-code"
                :placeholder="t('auth.login.twoFactor')"
              />
            </div>
            <div :class="cm.authButtonRow">
              <Button
                type="button"
                size="lg"
                :class="isLoggingIn ? cm.authHidden : cm.authLoginSignup"
                :disabled="isLoggingIn"
                @click="router.push('/signup')"
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
          </fieldset>
        </form>
        <div :class="cm.authAfterSubmit">
          <button
            type="button"
            :class="cm.forgotPasswordLink"
            @click="router.push('/forgot-password')"
          >
            {{ t('auth.login.forgotPassword') }}
          </button>
        </div>
        <OAuthButtons />
      </div>
    </main>
    <Footer />
  </div>
</template>
