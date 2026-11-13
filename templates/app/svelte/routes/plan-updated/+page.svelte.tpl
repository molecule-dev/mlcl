<script lang="ts">
  import { resolve } from '$app/paths'

  import { createAuthStores } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Button from '../../components/Button.svelte'
  import Flex from '../../components/Flex.svelte'
  import Spinner from '../../components/Spinner.svelte'
  import { createAppI18nStores } from '../../lib/i18n.js'

  const cm = getClassMap()
  const { t } = createAppI18nStores()
  const { state: authState } = createAuthStores()
</script>

{#if !$authState.initialized}
  <Flex align="center" justify="center" class={cm.sp('py', 12)}>
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
