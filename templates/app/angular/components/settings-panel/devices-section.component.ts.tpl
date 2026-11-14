import { ChangeDetectorRef, Component, inject, type OnInit } from '@angular/core'

import { HTTP_CLIENT, t } from '@molecule/app-angular'
import type { HttpClient } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { Button, MoleculeSpinner } from '@molecule/app-ui-angular'

import { IconComponent } from '../icon.component.js'

/** A user's registered device (subset rendered in the settings list). */
export interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/**
 * Devices section — lists the user's registered devices and lets them revoke
 * (sign out) any device other than the one they are currently using.
 *
 * Port of `@molecule/app-settings-panel-react`'s `DevicesSection`. Revoking
 * deletes the device row (`DELETE /api/devices/:id`); the API's authorization
 * layer rejects that device's session on its next request, so the removed device
 * is actually signed out — not just hidden from the list. The current device is
 * labelled "This device" and is not revocable here (use Sign out for the current
 * session).
 */
@Component({
  selector: 'app-settings-devices-section',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button, MoleculeSpinner, IconComponent],
  template: `
    <section>
      <div [class]="cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))">
        <h3 [class]="cm.sectionHeading">
          {{ t('settings.devices', undefined, { defaultValue: 'Devices' }) }}
        </h3>
        @if (loading) {
          <mol-spinner size="xs" />
        }
      </div>
      @if (devices.length > 0) {
        <ul [class]="cm.stack(2)">
          @for (device of devices; track device.id) {
            <li>
              <div
                [class]="
                  cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                    cm.sp('py', 1)
                  )
                "
              >
                <span>
                  {{ device.name || device.platform }}
                  @if (device.isCurrent) {
                    <span [class]="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))">
                      {{ t('settings.thisDevice', undefined, { defaultValue: 'This device' }) }}
                    </span>
                  }
                </span>
                @if (device.isCurrent) {
                  <svg appIcon name="chevron-right" [size]="16" [className]="cm.textSubtle"></svg>
                } @else if (confirmingId === device.id) {
                  <div [class]="cm.flex({ align: 'center', gap: 'sm' })">
                    <button
                      mol-button
                      variant="ghost"
                      size="sm"
                      [disabled]="revokingId === device.id"
                      (click)="confirmingId = null"
                    >
                      {{ t('common.cancel', undefined, { defaultValue: 'Cancel' }) }}
                    </button>
                    <button
                      mol-button
                      color="error"
                      size="sm"
                      [loading]="revokingId === device.id"
                      data-mol-id="device-revoke-confirm"
                      (click)="revoke(device.id)"
                    >
                      {{ t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' }) }}
                    </button>
                  </div>
                } @else {
                  <button
                    mol-button
                    variant="ghost"
                    size="sm"
                    data-mol-id="device-revoke"
                    (click)="confirmingId = device.id"
                  >
                    {{ t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' }) }}
                  </button>
                }
              </div>
              @if (confirmingId === device.id) {
                <p [class]="cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))">
                  {{
                    t('settings.revokeDeviceWarning', undefined, {
                      defaultValue: "This device's access will be revoked shortly. Sign it out?",
                    })
                  }}
                </p>
              }
            </li>
          }
        </ul>
      } @else if (!loading) {
        <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">
          {{ t('settings.noDevices', undefined, { defaultValue: 'No devices' }) }}
        </p>
      }
    </section>
  `,
})
export class DevicesSectionComponent implements OnInit {
  private readonly http: HttpClient = inject(HTTP_CLIENT)
  private readonly cdr = inject(ChangeDetectorRef)

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The registered devices. */
  devices: Device[] = []
  /** Whether the device list is still loading. */
  loading = true
  /** The device whose revoke confirmation is showing. */
  confirmingId: string | null = null
  /** The device currently being revoked. */
  revokingId: string | null = null

  ngOnInit(): void {
    void this.load()
  }

  /** Loads the caller's device rows. */
  async load(): Promise<void> {
    try {
      // GET /api/devices responds with the ARRAY itself (see the device
      // resource's query handler) — response.data IS the rows.
      const response = await this.http.get<Device[]>('/api/devices')
      this.devices = Array.isArray(response.data) ? response.data : []
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      this.loading = false
      this.cdr.markForCheck()
    }
  }

  /**
   * Revokes (signs out) a device, then reloads the list.
   *
   * @param id - The device row id.
   */
  async revoke(id: string): Promise<void> {
    this.revokingId = id
    try {
      await this.http.delete(`/api/devices/${id}`)
      this.confirmingId = null
      await this.load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      this.revokingId = null
      this.cdr.markForCheck()
    }
  }
}
