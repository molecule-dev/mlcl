<script lang="ts">
  import { createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { APP_NAME, APP_DESCRIPTION, WEBSITE_URL } from '$lib/branding.js'

  // About page — reachable at `/about`, where the Footer's "About" link points.
  // Every app ships one so the footer link is never a dead end. Edit freely, or
  // replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
  // is your public site — when set, this page links out to it; leave it empty and
  // the outbound link simply doesn't render.
  const { t } = createI18nStores()
  const cm = getClassMap()
</script>

<div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
  <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
    {$t('about.title', { appName: APP_NAME })}
  </h1>
  <p class={cm.cn(cm.sp('pt', 4), cm.textMuted)}>
    {APP_DESCRIPTION}
  </p>
  {#if WEBSITE_URL}
    <p class={cm.sp('pt', 6)}>
      <a class={cm.link} href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
        {$t('about.visitWebsite')}
      </a>
    </p>
  {/if}
</div>
