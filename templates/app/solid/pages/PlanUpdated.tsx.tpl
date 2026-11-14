import { A } from '@solidjs/router'
import { Show } from 'solid-js'

import { useAuth, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Spinner } from '@molecule/app-ui-solid'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = useAuth()

  return (
    <Show
      when={state().initialized}
      fallback={
        <Flex align="center" justify="center" className={cm.sp('py', 12)}>
          <Spinner />
        </Flex>
      }
    >
      <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
        <h1 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
          {t('planUpdated.message')}
        </h1>
        <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>
          {t('planUpdated.thankYou')}
        </h2>
        <A href="/">
          <Button>{t('planUpdated.returnHome')}</Button>
        </A>
      </div>
    </Show>
  )
}
