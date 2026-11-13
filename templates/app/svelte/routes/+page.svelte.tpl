<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'
  import { createAuthStores, createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  const { user } = createAuthStores<UserProfile>()
  const { t } = createI18nStores()
  const cm = getClassMap()
</script>

<div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
  <h2 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
    {$t('home.greeting')}{$user?.name || $user?.email || $t('home.world')}!
  </h2>
</div>
