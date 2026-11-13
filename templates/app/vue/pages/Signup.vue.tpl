<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-vue'
import { useAuth, useSignup, useTranslation } from '@molecule/app-vue'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import FloatingInput from '../components/FloatingInput.vue'
import Footer from '../components/Footer.vue'
import { formSubmitErrorMessages } from '../components/formSubmitError.js'
import Icon from '../components/Icon.vue'
import OAuthButtons from '../components/OAuthButtons.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const { status, signup } = useSignup()
const { isAuthenticated } = useAuth()
const email = ref('')
const password = ref('')
const name = ref('')

const isSigningUp = computed(() => status.value === 'pending')

// Route into the app whenever a session exists — covers the OAuth callback
// completing on this page (its exchange sets auth state without a submit)
// and an already-authenticated user landing on /signup directly.
watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) router.replace('/')
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  await signup({ email: email.value, password: password.value, name: name.value || undefined })
  router.replace('/')
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
      <h1 :class="cm.srOnly">{{ t('auth.signup.signUp') }}</h1>
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
                :placeholder="t('auth.signup.email')"
              />
            </div>
            <div :class="cm.authField">
              <FloatingInput
                v-model="password"
                type="password"
                auto-complete="new-password"
                required
                :placeholder="t('auth.signup.password')"
              />
            </div>
            <div :class="cm.authField">
              <FloatingInput
                v-model="name"
                type="text"
                auto-complete="name"
                :placeholder="t('auth.signup.name')"
              />
            </div>
            <div :class="cm.authButtonRow">
              <Button
                type="button"
                size="lg"
                color="secondary"
                :class="cm.authBackButton"
                :aria-label="t('common.goBack')"
                @click="router.push('/login')"
              >
                <Icon name="arrow-left" :size="25" />
              </Button>
              <Button
                type="submit"
                size="lg"
                color="success"
                :class="cm.authSubmitButton"
                :disabled="isSigningUp"
              >
                {{ isSigningUp ? t('auth.signup.signingUp') : t('auth.signup.signUp') }}
              </Button>
            </div>
          </fieldset>
        </form>
        <OAuthButtons />
      </div>
    </main>
    <Footer />
  </div>
</template>
