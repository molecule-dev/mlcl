import { Component } from '@angular/core'
import { t } from '@molecule/app-angular'
import { MoleculeButton } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { IconComponent } from './icon.component.js'
import { SettingsPanelComponent } from './settings-panel.component.js'

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [MoleculeButton, IconComponent, SettingsPanelComponent],
  template: `
    <mol-button
      variant="ghost"
      size="sm"
      (handleClick)="settingsOpen = true"
      [attr.aria-label]="t('userMenu.open')"
    >
      <app-icon name="user" [size]="20" />
    </mol-button>
    @if (settingsOpen) {
      <div
        [class]="overlayClasses"
        (click)="settingsOpen = false"
      ></div>
      <div
        [class]="drawerClasses"
      >
        <app-settings-panel (closePanel)="settingsOpen = false" />
      </div>
    }
  `,
})
export class UserMenuComponent {
  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  get overlayClasses(): string { return this.cm.overlay }
  get drawerClasses(): string { return this.cm.drawer }

  settingsOpen = false
}
