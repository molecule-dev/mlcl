<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePasswordReset, useTranslation } from '@molecule/app-vue'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-vue'
import Icon from '../components/Icon.vue'
import FloatingInput from '../components/FloatingInput.vue'
import Footer from '../components/Footer.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

const { t } = useTranslation()
const cm = getClassMap()
const router = useRouter()
const { requestStatus, requestError, requestReset } = usePasswordReset()
const email = ref('')
const submitted = ref(false)
const message = ref('')

const isSubmitting = computed(() => requestStatus.value === 'pending')

async function handleSubmit() {
  try {
    await requestReset({ email: email.value })
    message.value = t('auth.forgotPassword.success')
    submitted.value = true
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
        <form v-if="!submitted" @submit.prevent="handleSubmit">
          <div :class="cm.authField">
            <FloatingInput
              id="email"
              v-model="email"
              type="email"
              auto-complete="email"
              auto-focus
              required
              :placeholder="t('auth.forgotPassword.email')"
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
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? t('auth.forgotPassword.submitting') : t('common.submit') }}
            </Button>
          </div>
        </form>
        <div v-else>
          <p :class="cm.cn(cm.textSize('sm'), cm.textMuted, cm.authField)">{{ message }}</p>
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
              size="lg"
              color="success"
              :class="cm.authSubmitButton"
              @click="router.push('/reset-password')"
            >
              {{ t('common.continue') }}
              <Icon name="arrow-right" :size="20" :class="cm.authArrowIcon" />
            </Button>
          </div>
        </div>
        <div v-if="requestError" :class="cm.authFormError">
          {{ requestError.message }}
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>
