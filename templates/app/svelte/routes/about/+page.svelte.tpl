<script lang="ts">
  import { APP_DESCRIPTION, APP_NAME, WEBSITE_URL } from '$lib/branding.js'

  import { getClassMap } from '@molecule/app-ui'

  import { createAppI18nStores } from '../../lib/i18n.js'

  // About page — reachable at `/about`, where the Footer's "About" link points.
  // Every app ships one so the footer link is never a dead end. Edit freely, or
  // replace with your own story/marketing content. `WEBSITE_URL` (in branding.ts)
  // is your public site — when set, this page links out to it; leave it empty and
  // the outbound link simply doesn't render.
  const cm = getClassMap()
  const { t } = createAppI18nStores()
</script>

<div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
  <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
    {$t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
  </h1>
  <p class={cm.cn(cm.sp('pt', 4), cm.textMuted)}>
    {$t('about.description', undefined, { defaultValue: APP_DESCRIPTION })}
  </p>
  {#if WEBSITE_URL}
    <p class={cm.sp('pt', 6)}>
      <!-- rel="external" is SvelteKit's marker for a link the client router
           must leave alone (the href is a full URL); the linter requires it. -->
      <a class={cm.link} href={WEBSITE_URL} target="_blank" rel="external noopener noreferrer">
        {$t('about.visitWebsite', undefined, { defaultValue: 'Visit our website →' })}
      </a>
    </p>
  {/if}
</div>
