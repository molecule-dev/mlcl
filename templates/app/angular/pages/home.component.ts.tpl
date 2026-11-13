/**
 * A page: one component per route, registered in `main.ts`.
 *
 * Load page data through a service that reads the bonded clients (an injected
 * `MoleculeAuthService`, an http client), not with a hand-written subscription
 * that sets a `cancelled` flag in its teardown and re-subscribes in a `takeUntil`
 * guard: a subscription rebuilt on every change detection cancels its own
 * request, and the answer is then dropped on a slow (deployed) server although
 * it always arrives in time on localhost.
 */
import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import type { UserProfile } from '@molecule/app-auth'
import { MoleculeAuthService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import type { Subscription } from 'rxjs'

/**
 * Landing page: greets the signed-in user by name, email, or "world".
 *
 * Port of the React `Home` page — same wrapper (`cm.textCenter` +
 * `cm.sp('py', 12)`), same `h1` classes, and the same "greeting, name!"
 * concatenation with `home.world` as the fallback.
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
export class HomeComponent implements OnInit, OnDestroy {
  private readonly authService: MoleculeAuthService<UserProfile> = inject(MoleculeAuthService)
  private readonly cdr = inject(ChangeDetectorRef)
  private subscription?: Subscription

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The signed-in user, or null. */
  user: UserProfile | null = null

  ngOnInit(): void {
    this.subscription = this.authService.user$.subscribe((user) => {
      this.user = user
      this.cdr.markForCheck()
    })
  }

  /** What the greeting addresses: the user's name, email, or the world. */
  get greetingTarget(): string {
    return this.user?.name || this.user?.email || t('home.world')
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
}
