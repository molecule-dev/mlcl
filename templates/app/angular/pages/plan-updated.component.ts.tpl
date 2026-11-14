import { Component } from '@angular/core'

import { Link, useAuth, useTranslation } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { Button, Spinner } from '@molecule/app-ui-angular'

/**
 * Post-checkout page: confirms the plan change and offers a way back home.
 */
@Component({
  selector: 'app-plan-updated',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button, Link, Spinner],
  template: `
    @if (!initialized()) {
      <div [class]="cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 12))">
        <div mol-spinner></div>
      </div>
    } @else {
      <div [class]="cm.cn(cm.textCenter, cm.sp('py', 12))">
        <h1 [class]="headingClasses">{{ t('planUpdated.message') }}</h1>
        <h2 [class]="subheadingClasses">{{ t('planUpdated.thankYou') }}</h2>
        <a molLink="/">
          <button mol-button>{{ t('planUpdated.returnHome') }}</button>
        </a>
      </div>
    }
  `,
})
export class PlanUpdatedComponent {
  private readonly auth = useAuth()
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** Whether the session has been initialized. */
  protected initialized(): boolean {
    return this.auth.state().initialized
  }

  /** The first heading's classes. */
  protected get headingClasses(): string {
    return this.cm.cn(this.cm.textSize('2xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 2))
  }

  /** The second heading's classes. */
  protected get subheadingClasses(): string {
    return this.cm.cn(this.cm.textSize('2xl'), this.cm.fontWeight('bold'), this.cm.sp('mb', 8))
  }
}
