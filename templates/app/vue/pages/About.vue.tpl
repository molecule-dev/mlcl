<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { APP_NAME, APP_DESCRIPTION, WEBSITE_URL } from '../branding.js'

// About page — reachable at `/about`, where the Footer's "About" link points.
// Every app ships one so the footer link is never a dead end. Edit freely, or
// replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
// is your public site — when set, this page links out to it; leave it empty and
// the outbound link simply doesn't render.
const { t } = useTranslation()
const cm = getClassMap()
</script>

<template>
  <div :class="cm.cn(cm.textCenter, cm.sp('py', 12))">
    <h1 :class="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">
      {{ t('about.title', { appName: APP_NAME }) }}
    </h1>
    <p :class="cm.cn(cm.sp('pt', 4), cm.textMuted)">
      {{ APP_DESCRIPTION }}
    </p>
    <p v-if="WEBSITE_URL" :class="cm.sp('pt', 6)">
      <a :class="cm.link" :href="WEBSITE_URL" target="_blank" rel="noopener noreferrer">
        {{ t('about.visitWebsite') }}
      </a>
    </p>
  </div>
</template>
