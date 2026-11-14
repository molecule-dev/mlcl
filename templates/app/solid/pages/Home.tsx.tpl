/**
 * A page: one component per route, registered in `App.tsx`.
 *
 * Load data with `useQuery` from `@molecule/app-query-solid` (add `@molecule/app-query` and a
 * bond such as `@molecule/app-query-memory`, which the scaffold's `src/bonds/` wires), not with a
 * hand-written `createEffect` + `fetch`: an effect that sets a `cancelled` flag in its cleanup
 * and early-returns on a guard cancels its own request whenever a dependency is rebuilt on each
 * run (`const [.., setError] = useSomePrimitive()` returning inline functions), and the answer
 * is then dropped on a slow (deployed) server although it always arrives in time on localhost.
 */
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  return (
    <div class={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('home.greeting')}
        {user()?.name || user()?.email || t('home.world')}!
      </h1>
    </div>
  )
}
