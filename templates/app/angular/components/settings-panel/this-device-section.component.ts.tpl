import { Component } from '@angular/core'
import { createDeviceService, t } from '@molecule/app-angular'
import { getClassMap } from '@molecule/app-ui'

/**
 * "This device" detail strip — OS, browser, online/offline.
 *
 * Port of `@molecule/app-settings-panel-react`'s `ThisDeviceSection`: it reads
 * the bonded device provider and `navigator.onLine`, with no side effects and
 * no app-specific state.
 */
@Component({
  selector: 'app-settings-this-device-section',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [],
  template: `
    <section>
      <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.thisDevice') }}</h3>
      <dl [class]="cm.cn(cm.stack(1), cm.textSize('sm'))">
        <div [class]="cm.flex({ justify: 'between' })">
          <dt [class]="cm.textMuted">{{ t('settings.platform') }}</dt>
          <dd>{{ deviceInfo.os.name || t('settings.unknown') }}</dd>
        </div>
        <div [class]="cm.flex({ justify: 'between' })">
          <dt [class]="cm.textMuted">{{ t('settings.browser') }}</dt>
          <dd>{{ deviceInfo.browser.name || t('settings.unknown') }}</dd>
        </div>
        <div [class]="cm.flex({ justify: 'between' })">
          <dt [class]="cm.textMuted">{{ t('settings.network') }}</dt>
          <dd>{{ online ? t('settings.online') : t('settings.offline') }}</dd>
        </div>
      </dl>
    </section>
  `,
})
export class ThisDeviceSectionComponent {
  private readonly device = createDeviceService()

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The current device's OS/browser details. */
  readonly deviceInfo = this.device.deviceInfo

  /** Whether the browser reports a network connection. */
  readonly online = navigator.onLine
}
