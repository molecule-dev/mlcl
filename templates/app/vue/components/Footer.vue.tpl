<script setup lang="ts">
import { ref, computed } from 'vue'
import { getClassMap } from '@molecule/app-ui'
import { useVersion, useTranslation } from '@molecule/app-vue'
import { Modal } from '@molecule/app-ui-vue'
import Icon from './Icon.vue'
import { loadContent } from '../config.js'
import { APP_NAME } from '../branding.js'

const { t, locale, setLocale, locales } = useTranslation()
const cm = getClassMap()
const { state: versionState } = useVersion()
const privacyOpen = ref(false)
const termsOpen = ref(false)
const languageOpen = ref(false)
const sortedLocales = computed(() => [...locales.value].sort((a, b) => a.name.localeCompare(b.name)))

async function changeLocale(code: string) {
  await setLocale(code)
  languageOpen.value = false
}

async function openPrivacy() {
  await loadContent('privacyPolicy')
  privacyOpen.value = true
}

async function openTerms() {
  await loadContent('termsOfService')
  termsOpen.value = true
}
</script>

<template>
  <section :class="cm.footerBar">
    <RouterLink to="/about" :class="cm.footerLink">
      {{ t('footer.about', { appName: APP_NAME }) }}
    </RouterLink>
    <button
      type="button"
      :class="cm.footerButton"
      @click="openPrivacy"
    >
      {{ t('footer.privacyPolicy') }}
    </button>
    <button
      type="button"
      :class="cm.footerButton"
      @click="openTerms"
    >
      {{ t('footer.termsOfService') }}
    </button>
    <button
      type="button"
      :class="cm.footerButton"
      :aria-label="t('footer.language')"
      @click="languageOpen = true"
    >
      <Icon name="globe" :size="14" />
      {{ locales.find(l => l.code === locale)?.name }}
    </button>
    <span :class="cm.footerLink">v{{ versionState.version || '1.0.0' }}</span>
  </section>
  <Modal :open="privacyOpen" :title="t('footer.privacyPolicy')" size="lg" @close="privacyOpen = false">
    <div :class="cm.prose" v-html="t('content.privacyPolicy', { appName: APP_NAME })" />
  </Modal>
  <Modal :open="termsOpen" :title="t('footer.termsOfService')" size="lg" @close="termsOpen = false">
    <div :class="cm.prose" v-html="t('content.termsOfService')" />
  </Modal>
  <Modal :open="languageOpen" :title="t('footer.language')" size="lg" @close="languageOpen = false">
    <div :class="cm.languageGrid">
      <button
        v-for="l in sortedLocales"
        :key="l.code"
        type="button"
        @click="changeLocale(l.code)"
        :class="l.code === locale ? cm.languageActive : cm.languageOption"
      >
        {{ l.name }}
      </button>
    </div>
  </Modal>
</template>
