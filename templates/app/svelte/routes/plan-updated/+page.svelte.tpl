<script lang="ts">
  import { resolve } from '$app/paths'

  import { createAuthStores, createI18nStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, Spinner } from '@molecule/app-ui-svelte'

  const cm = getClassMap()
  const { t } = createI18nStores()
  const { state: authState } = createAuthStores()
</script>

{#if !$authState.initialized}
  <Flex align="center" justify="center" className={cm.sp('py', 12)}>
    <Spinner />
  </Flex>
{:else}
  <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
    <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
      {$t('planUpdated.message')}
    </h1>
    <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
      {$t('planUpdated.thankYou')}
    </h2>
    <a href={resolve('/')}>
      <Button>{$t('planUpdated.returnHome')}</Button>
    </a>
  </div>
{/if}
