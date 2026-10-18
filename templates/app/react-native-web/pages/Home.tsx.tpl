/**
 * A page: one component per route, registered in `App.tsx`.
 *
 * Load data with `useQuery` from `@molecule/app-query-react` (add `@molecule/app-query` and a
 * bond such as `@molecule/app-query-memory`, which the scaffold's `src/bonds/` wires), not with a
 * hand-written `useEffect` + `fetch`: an effect that sets a `cancelled` flag in its cleanup and
 * early-returns on a ref guard cancels its own request whenever a dependency is rebuilt each render
 * (`const [.., setError] = useSomeHook()` returning inline functions), and the answer is then
 * dropped on a slow (deployed) server although it always arrives in time on localhost.
 */
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  return (
    <div className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
      <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('home.greeting')}{user?.name || user?.email || t('home.world')}!
      </h2>
    </div>
  )
}
