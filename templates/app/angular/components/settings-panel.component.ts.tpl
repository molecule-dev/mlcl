import { Component } from '@angular/core'

import { Link, useTranslation } from '@molecule/app-angular'
import {
  AccountSection,
  AuthSection,
  BillingSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-angular'
import { getClassMap } from '@molecule/app-ui'
import { Separator, usePanelClose } from '@molecule/app-ui-angular'

import { FooterComponent } from './footer.component.js'

/**
 * The app's settings drawer: the shared settings-panel package's sections in
 * React's order, inside the shared `SettingsContainer`.
 */
@Component({
  selector: 'app-settings-panel',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  inputs: ['onClose'],
  imports: [
    AccountSection,
    AuthSection,
    BillingSection,
    DevicesSection,
    FooterComponent,
    Link,
    LogOutDeleteSection,
    NotificationsSection,
    Separator,
    SettingsContainer,
    ThisDeviceSection,
  ],
  template: `
    <div mol-settings-container [onClose]="onClose">
      <!-- The full profile page: the drawer's sections update one field at a time, while
          /settings edits the whole profile as one native form (and is where the app's
          own profile fields belong). Close the drawer first so navigation is not hidden. -->
      <a
        molLink="/settings"
        (click)="onClose()"
        [class]="pageLinkClasses"
        data-mol-id="settings-page-link"
      >
        {{ t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' }) }}
      </a>
      <section mol-settings-account></section>
      <mol-auth-section></mol-auth-section>
      <section mol-settings-notifications></section>
      <section mol-settings-billing></section>
      <section mol-settings-devices></section>
      <section mol-settings-this-device></section>
      <div mol-separator></div>
      <mol-log-out-delete-section></mol-log-out-delete-section>
      <app-footer></app-footer>
    </div>
  `,
})
export class SettingsPanelComponent {
  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /**
   * The reactive translation function (re-evaluates on locale change), read in
   * the injection context.
   */
  protected readonly t = this.i18n.t

  /**
   * Closes the drawer hosting this panel (React's `onClose` prop). The default
   * resolves the enclosing drawer's own close callback at call time, the way
   * React's `usePanelClose()` context read does.
   */
  onClose: () => void = usePanelClose()

  /** The "/settings" link's classes. */
  protected get pageLinkClasses(): string {
    return this.cm.cn(this.cm.button({ variant: 'outline' }), this.cm.sp('mb', 3))
  }
}
