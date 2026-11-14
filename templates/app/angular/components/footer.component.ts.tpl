import { Component } from '@angular/core'

import { AppFooter } from '@molecule/app-footer-angular'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

/**
 * Thin wrapper around the shared `AppFooter` that injects this app's branding
 * and legal-content loader.
 */
@Component({
  selector: 'app-footer',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [AppFooter],
  template: `
    <mol-app-footer [appName]="APP_NAME" aboutHref="/about" [loadContent]="loadContent">
    </mol-app-footer>
  `,
})
export class FooterComponent {
  // The "About" link points at the in-app /about page (every app ships one), NOT
  // at an external URL. WEBSITE_URL in branding.ts is your public/marketing site,
  // surfaced on the About page itself — it is not the About link.
  /** The app's display name. */
  readonly APP_NAME = APP_NAME
  /** The app's lazy legal-content loader. */
  readonly loadContent = loadContent
}
