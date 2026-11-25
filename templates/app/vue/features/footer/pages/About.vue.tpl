<script setup lang="ts">
import { computed } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { APP_DESCRIPTION, APP_NAME, WEBSITE_URL } from '../branding.js'

// About page — reachable at `/about`, where the Footer's "About" link points.
// Every app ships one so the footer link is never a dead end. Edit freely, or
// replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
// is your public site — when set, this page links out to it; leave it empty and
// the outbound link simply doesn't render.
const { t } = useTranslation()
const cm = getClassMap()

// The title is translated in the script block: its English default contains
// `{{appName}}`, and a `{{ … }}` inside a template interpolation would close
// the Vue mustache early (a template parse error).
const title = computed(() =>
  t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' }),
)
</script>

<template>
  <div :class="cm.cn(cm.textCenter, cm.sp('py', 12))">
    <h1 :class="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">{{ title }}</h1>
    <p :class="cm.cn(cm.sp('pt', 4), cm.textMuted)">
      {{ t('about.description', undefined, { defaultValue: APP_DESCRIPTION }) }}
    </p>
    <p v-if="WEBSITE_URL" :class="cm.sp('pt', 6)">
      <a :class="cm.link" :href="WEBSITE_URL" target="_blank" rel="noopener noreferrer">
        {{ t('about.visitWebsite', undefined, { defaultValue: 'Visit our website →' }) }}
      </a>
    </p>
  </div>
</template>
