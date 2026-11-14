/**
 * A page: one component per route, registered in `main.ts`.
 *
 * Load page data with `useQuery` from `@molecule/app-query-angular` (add
 * `@molecule/app-query` and a bond such as `@molecule/app-query-memory`, which
 * the scaffold's `src/bonds/` wires), not with a hand-written subscription that
 * sets a `cancelled` flag in its teardown and re-subscribes in a `takeUntil`
 * guard: a subscription rebuilt on every change detection cancels its own
 * request, and the answer is then dropped on a slow (deployed) server although
 * it always arrives in time on localhost.
 */
import { Component } from '@angular/core'

import { useAuth, useTranslation } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'

/**
 * Landing page: greets the signed-in user by name, email, or "world".
 */
@Component({
  selector: 'app-home',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [],
  template: `
    <div [class]="cm.cn(cm.textCenter, cm.sp('py', 12))">
      <h1 [class]="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">
        {{ t('home.greeting') }}{{ greetingTarget }}!
      </h1>
    </div>
  `,
})
export class HomeComponent {
  private readonly auth = useAuth<UserProfile>()
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** What the greeting addresses: the user's name, email, or the world. */
  protected get greetingTarget(): string {
    const user = this.auth.user()
    return user?.name || user?.email || this.t('home.world')
  }
}
