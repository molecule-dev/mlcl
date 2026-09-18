import { Show } from 'solid-js'
import { A } from '@solidjs/router'
import { createAuth, useTranslate } from '@molecule/app-solid'
import { Button, Flex, Spinner } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'

export function PlanUpdated() {
  const cm = getClassMap()
  const t = useTranslate()
  const { state } = createAuth()

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
        <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>{t('planUpdated.message')}</h2>
        <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))}>{t('planUpdated.thankYou')}</h2>
        <A href="/">
          <Button>{t('planUpdated.returnHome')}</Button>
        </A>
      </div>
    </Show>
  )
}
