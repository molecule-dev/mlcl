import { Show, type ParentProps } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { createAuth, useTranslate } from '@molecule/app-solid'

export function AuthGuard(props: ParentProps) {
  const t = useTranslate()
  const { state, isAuthenticated } = createAuth()

  return (
    <Show when={state().initialized} fallback={<div>{t('common.loading')}</div>}>
      <Show when={isAuthenticated()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  )
}
