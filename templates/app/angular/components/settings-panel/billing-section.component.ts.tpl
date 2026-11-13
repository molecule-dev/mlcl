import {
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  type OnDestroy,
  type OnInit,
} from '@angular/core'
import { Router } from '@angular/router'

import { HTTP_CLIENT, t } from '@molecule/app-angular'
import type { HttpClient } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'

import { ButtonComponent } from '../button.component.js'

/**
 * Billing section — current plan + Upgrade button.
 *
 * Port of `@molecule/app-settings-panel-react`'s `BillingSection`: it fetches
 * `/api/billing/status` on mount and uses the returned plan name as a more
 * accurate label than the supplied default; the `plan` input stays the fallback
 * (offline rendering, or an app without `/billing/status`). The Upgrade button
 * navigates to `upgradeTo` (default `/settings`).
 */
@Component({
  selector: 'app-settings-billing-section',
  standalone: true,
  imports: [ButtonComponent],
  inputs: ['plan', 'upgradeTo'],
  template: `
    <section>
      <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.billing') }}</h3>
      <div [class]="cm.flex({ align: 'center', justify: 'between' })">
        <span [class]="cm.textSize('sm')">
          {{ t('settings.plan') }}<strong>{{ livePlan ?? plan }}</strong>
        </span>
        <button appButton variant="outline" size="sm" (click)="upgrade()">
          {{ t('settings.upgrade') }}
        </button>
      </div>
    </section>
  `,
})
export class BillingSectionComponent implements OnInit, OnDestroy {
  private readonly http: HttpClient = inject(HTTP_CLIENT)
  private readonly router = inject(Router)
  private readonly cdr = inject(ChangeDetectorRef)
  private disposed = false

  /** The fallback plan label. */
  @Input() plan = 'Free'

  /** The route the Upgrade button opens. */
  @Input() upgradeTo = '/settings'

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The plan name reported by the billing status route. */
  livePlan: string | null = null

  ngOnInit(): void {
    // Refresh the current plan from the bonded entitlements/billing status
    // endpoint on mount. Fire-and-forget; `plan` is the fallback if the fetch fails.
    void this.http
      .get<{ name?: string }>('/api/billing/status')
      .then((response) => {
        if (this.disposed) return
        const name = response.data?.name
        if (typeof name === 'string' && name) this.livePlan = name
        this.cdr.markForCheck()
      })
      .catch((_error) => {
        // Fallback to the supplied plan label.
      })
  }

  /** Opens the upgrade route. */
  upgrade(): void {
    void this.router.navigate([this.upgradeTo])
  }

  ngOnDestroy(): void {
    this.disposed = true
  }
}
