<script setup lang="ts">
import { computed, ref } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-vue'
import { useTranslation, useVersion } from '@molecule/app-vue'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import Icon from './Icon.vue'

const { t, locale, setLocale, locales } = useTranslation()
const cm = getClassMap()
const { state: versionState } = useVersion()
const privacyOpen = ref(false)
const termsOpen = ref(false)
const languageOpen = ref(false)
const sortedLocales = computed(() =>
  [...locales.value].sort((a, b) => a.name.localeCompare(b.name)),
)

const currentLocaleName = computed(() => locales.value.find((l) => l.code === locale.value)?.name)

const version = computed(() =>
  t(
    'footer.version',
    { version: versionState.value.version || '1.0.0' },
    { defaultValue: 'v{{version}}' },
  ),
)

const aboutLabel = computed(() =>
  t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' }),
)

const legalNotConfigured = computed(() =>
  t(
    'footer.legalNotConfigured',
    {},
    {
      defaultValue: 'This content has not been configured yet. The app owner must provide it.',
    },
  ),
)

// HTML-escape an interpolation value before it enters a translation whose
// result is rendered as HTML (v-html). Vue escapes text children
// automatically but NOT values interpolated into HTML strings — an appName
// containing markup would otherwise execute inside the legal content.
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const privacyHtml = computed(() =>
  t('content.privacyPolicy', { appName: escapeHtml(APP_NAME) }, { defaultValue: '' }),
)
const termsHtml = computed(() =>
  t('content.termsOfService', { appName: escapeHtml(APP_NAME) }, { defaultValue: '' }),
)

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
  <!-- `<footer>` (contentinfo landmark), not a bare <section> — axe's
      `region` rule requires all page content inside landmarks, and
      screen-reader users jump to the footer by landmark. -->
  <footer :class="cm.footerBar">
    <RouterLink to="/about" :class="cm.footerLink">
      {{ aboutLabel }}
    </RouterLink>
    <button type="button" :class="cm.footerButton" @click="openPrivacy">
      {{ t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' }) }}
    </button>
    <button type="button" :class="cm.footerButton" @click="openTerms">
      {{ t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' }) }}
    </button>
    <button
      type="button"
      :class="cm.footerButton"
      :aria-label="t('footer.language', {}, { defaultValue: 'Language' })"
      @click="languageOpen = true"
    >
      <Icon name="globe" :size="14" /> {{ currentLocaleName }}
    </button>
    <span :class="cm.footerLink">{{ version }}</span>
  </footer>
  <!-- Render legal HTML from the i18n catalog, or — when the app has registered
      none (the bond ships `content.*` empty by design) — a clear placeholder.
      Never a silently-blank modal, and never fabricated legal text. -->
  <Modal
    :open="privacyOpen"
    :title="t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })"
    size="lg"
    @close="privacyOpen = false"
  >
    <div v-if="privacyHtml.trim()" :class="cm.prose" v-html="privacyHtml" />
    <p v-else :class="cm.prose">{{ legalNotConfigured }}</p>
  </Modal>
  <Modal
    :open="termsOpen"
    :title="t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })"
    size="lg"
    @close="termsOpen = false"
  >
    <div v-if="termsHtml.trim()" :class="cm.prose" v-html="termsHtml" />
    <p v-else :class="cm.prose">{{ legalNotConfigured }}</p>
  </Modal>
  <Modal
    :open="languageOpen"
    :title="t('footer.language', {}, { defaultValue: 'Language' })"
    size="lg"
    @close="languageOpen = false"
  >
    <div :class="cm.languageGrid">
      <button
        v-for="l in sortedLocales"
        :key="l.code"
        type="button"
        :class="l.code === locale ? cm.languageActive : cm.languageOption"
        @click="changeLocale(l.code)"
      >
        {{ l.name }}
      </button>
    </div>
  </Modal>
</template>
