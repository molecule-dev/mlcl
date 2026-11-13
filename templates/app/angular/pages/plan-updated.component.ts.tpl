import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { Subscription } from 'rxjs'

import { MoleculeAuthService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { MoleculeSpinner } from '@molecule/app-ui-angular'

import { ButtonComponent } from '../components/button.component.js'

/**
 * Post-checkout page: confirms the plan change and offers a way back home.
 *
 * Port of the React `PlanUpdated` page — a centered spinner until the session is
 * initialized, then the two headings and the return-home button inside the same
 * `cm.textCenter` + `cm.sp('py', 12)` wrapper.
 */
@Component({
  selector: 'app-plan-updated',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [RouterLink, ButtonComponent, MoleculeSpinner],
  template: `
    @if (!initialized) {
      <div [class]="cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 12))">
        <mol-spinner />
      </div>
    } @else {
      <div [class]="cm.cn(cm.textCenter, cm.sp('py', 12))">
        <h1 [class]="headingClasses">{{ t('planUpdated.message') }}</h1>
        <h2 [class]="subheadingClasses">{{ t('planUpdated.thankYou') }}</h2>
        <a routerLink="/"
          ><button appButton>{{ t('planUpdated.returnHome') }}</button></a
        >
      </div>
    }
  `,
})
export class PlanUpdatedComponent implements OnInit, OnDestroy {
  private readonly authService = inject(MoleculeAuthService)
  private readonly cdr = inject(ChangeDetectorRef)
  private subscription?: Subscription

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** Whether the session has been initialized. */
  initialized = this.authService.state.initialized

  /** The first heading's classes. */
  get headingClasses(): string {
    return this.cm.cn(this.cm.textSize('2xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 2))
  }

  /** The second heading's classes. */
  get subheadingClasses(): string {
    return this.cm.cn(this.cm.textSize('2xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 8))
  }

  ngOnInit(): void {
    this.subscription = this.authService.state$.subscribe((state) => {
      this.initialized = state.initialized
      this.cdr.markForCheck()
    })
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
}
