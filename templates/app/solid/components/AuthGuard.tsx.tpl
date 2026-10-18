import { Show, type ParentProps } from 'solid-js'
import { Navigate } from '@solidjs/router'
import { createAuth, useTranslate } from '@molecule/app-solid'

export function AuthGuard(props: ParentProps) {
  const t = useTranslate()
  const { state, isAuthenticated } = createAuth()

  // `status`, not `initialized`: a stored token AND user make the FIRST render
  // 'authenticated' (the client restores synchronously), so a protected page must
  // not wait for the background verification. Only 'loading' means no decision.
  return (
    <Show when={state().status !== 'loading'} fallback={<div>{t('common.loading')}</div>}>
      <Show when={isAuthenticated()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  )
}
