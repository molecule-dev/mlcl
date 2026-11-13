import { Component, EventEmitter, Output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'
import { AccountSectionComponent } from './settings-panel/account-section.component.js'
import { AuthSectionComponent } from './settings-panel/auth-section.component.js'
import { BillingSectionComponent } from './settings-panel/billing-section.component.js'
import { DevicesSectionComponent } from './settings-panel/devices-section.component.js'
import { LogOutDeleteSectionComponent } from './settings-panel/log-out-delete-section.component.js'
import { NotificationsSectionComponent } from './settings-panel/notifications-section.component.js'
import { ThisDeviceSectionComponent } from './settings-panel/this-device-section.component.js'
import { FooterComponent } from './footer.component.js'

/**
 * The app's settings drawer content.
 *
 * Port of the React `SettingsPanel` wrapper: the settings container (a padded
 * vertical stack), a link to the full `/settings` profile page, then the
 * account, authentication, notifications, billing, devices and this-device
 * sections, a separator, the sign-out/delete section and the app footer.
 *
 * The drawer's close callback is emitted from here (`closePanel`) and threaded
 * to the sections that dismiss the drawer — the Angular equivalent of the React
 * panel's context provider, with the same DOM.
 */
@Component({
  selector: 'app-settings-panel',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [
    RouterLink,
    AccountSectionComponent,
    AuthSectionComponent,
    NotificationsSectionComponent,
    BillingSectionComponent,
    DevicesSectionComponent,
    ThisDeviceSectionComponent,
    LogOutDeleteSectionComponent,
    FooterComponent,
  ],
  template: `
    <div [class]="cm.cn(cm.sp('p', 6), cm.stack(6))">
      <!-- The full profile page: the drawer's sections update one field at a
          time, while /settings edits the whole profile as one native form.
          Close the drawer first so navigation is not hidden behind it. -->
      <a
        routerLink="/settings"
        (click)="closePanel.emit()"
        [class]="cm.cn(cm.button({ variant: 'outline' }), cm.sp('mb', 3))"
        data-mol-id="settings-page-link"
      >
        {{ t('settings.openProfilePage', undefined, { defaultValue: 'Edit your profile' }) }}
      </a>
      <app-settings-account-section />
      <app-settings-auth-section />
      <app-settings-notifications-section />
      <app-settings-billing-section />
      <app-settings-devices-section />
      <app-settings-this-device-section />
      <div role="none" [class]="cm.separator()"></div>
      <app-settings-log-out-delete-section (closePanel)="closePanel.emit()" />
      <app-footer />
    </div>
  `,
})
export class SettingsPanelComponent {
  /** Emits when the drawer should be dismissed. */
  @Output() readonly closePanel = new EventEmitter<void>()

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t
}
