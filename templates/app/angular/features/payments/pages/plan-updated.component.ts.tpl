import { Component } from '@angular/core'

import { PlanUpdated } from '@molecule/app-plan-updated-page-angular'

/**
 * The page a checkout returns to: it confirms the purchase with the API before thanking the
 * user. This app has no billing page, so the receipt link is left out.
 */
@Component({
  selector: 'app-plan-updated',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [PlanUpdated],
  template: `<mol-plan-updated [receiptHref]="null"></mol-plan-updated>`,
})
export class PlanUpdatedComponent {}
