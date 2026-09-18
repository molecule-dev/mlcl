<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLogin, useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import FloatingInput from '../components/FloatingInput.vue'
import OAuthButtons from '../components/OAuthButtons.vue'
import Footer from '../components/Footer.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const route = useRoute()
const from = (route.query.from as string) || '/'
const { status, error, login } = useLogin()
const email = ref('')
const password = ref('')
const twoFactorToken = ref('')

const isLoggingIn = computed(() => status.value === 'pending')

async function handleSubmit() {
  try {
    await login({ email: email.value, password: password.value })
    router.replace(from)
  } catch {
    // Error tracked in hook state
  }
}
</script>

<template>
  <div :class="cm.cn(cm.page, cm.flex({ direction: 'col' }))">
    <header :class="cm.cn(cm.headerBar, cm.headerFixed)">
      <div :class="cm.authHeaderInner">
        <Flex align="center" justify="between" :class="cm.h('full')">
          <Flex align="center" gap="xs">
            <img src="/logo.svg" :width="LOGO_SIZE" :height="LOGO_SIZE" alt="" :class="cm.logoIcon" />
            <span :class="cm.logoText">{{ APP_NAME }}</span>
          </Flex>
          <ThemeToggle />
        </Flex>
      </div>
    </header>
    <div :class="cm.authPageBody">
      <div :class="cm.authFormWrapper">
        <form @submit.prevent="handleSubmit">
          <div :class="cm.authField">
            <FloatingInput
              id="email"
              v-model="email"
              type="email"
              auto-complete="email"
              auto-focus
              required
              :placeholder="t('auth.login.email')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="password"
              v-model="password"
              type="password"
              auto-complete="current-password"
              required
              :placeholder="t('auth.login.password')"
            />
          </div>
          <div :class="cm.authField">
            <FloatingInput
              id="twoFactor"
              v-model="twoFactorToken"
              type="text"
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
          <div v-if="error" :class="cm.authFormError">
            {{ error.message }}
          </div>
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
    </div>
    <Footer />
  </div>
</template>
