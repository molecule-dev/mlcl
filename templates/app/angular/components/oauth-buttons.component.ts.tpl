import { Component } from '@angular/core'

import { OAuthButtons } from '@molecule/app-auth-ui-angular'

import { oauthConfig } from '../config.js'

/**
 * Thin wrapper around the shared `OAuthButtons` that injects this
 * app's `oauthConfig`. The shared package handles the "or continue with"
 * divider, brand logos, and accessibility labels.
 */
@Component({
  selector: 'app-oauth-buttons',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [OAuthButtons],
  template: `<div mol-auth-oauth-buttons [oauthConfig]="oauthConfig"></div>`,
})
export class OAuthButtonsComponent {
  /** This app's OAuth configuration. */
  readonly oauthConfig = oauthConfig
}
