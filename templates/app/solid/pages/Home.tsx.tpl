import type { UserProfile } from '@molecule/app-auth'
import { createAuth, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/**
 * A page: one component per route, registered in `App.tsx`.
 *
 * Load data through `@molecule/app-query` (add a bond such as
 * `@molecule/app-query-memory` or `@molecule/app-query-tanstack`, which the
 * scaffold's `src/bonds/` wires), not with a hand-written `createEffect` +
 * `fetch`: an effect that re-runs whenever a dependency is rebuilt each render
 * cancels its own request, and the answer is then dropped on a slow (deployed)
 * server although it always arrives in time on localhost.
 */
export function Home() {
  const cm = getClassMap()
  const t = useTranslate()
  const { user } = createAuth<UserProfile>()

  return (
    <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('home.greeting')}
        {user()?.name || user()?.email || t('home.world')}!
      </h1>
    </div>
  )
}
