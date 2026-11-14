<script lang="ts">
  import { Link, useAuth, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Flex, Spinner } from '@molecule/app-ui-svelte'

  const cm = getClassMap()
  const { t } = useTranslation()
  const { state: authState } = useAuth()
</script>

{#if !$authState.initialized}
  <Flex align="center" justify="center" className={cm.sp('py', 12)}>
    <Spinner />
  </Flex>
{:else}
  <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
    <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
      {t('planUpdated.message')}
    </h1>
    <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
      {t('planUpdated.thankYou')}
    </h2>
    <Link to="/">
      <Button>{t('planUpdated.returnHome')}</Button>
    </Link>
  </div>
{/if}
