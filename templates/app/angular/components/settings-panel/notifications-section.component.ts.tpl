import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import { HTTP_CLIENT, createPushService, t } from '@molecule/app-angular'
import { MoleculeSwitch } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import type { HttpClient } from '@molecule/app-http'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  readCurrentDevicePushEnabled,
  type PushToggleResult,
} from './push-toggle.js'

/**
 * Push-notification toggle section — the full receive-side enable chain:
 * browser permission → runtime VAPID public key
 * (`GET /api/devices/push/public-key`) → `pushManager.subscribe` with
 * `applicationServerKey` → PATCH the subscription onto the current device
 * row (`/api/devices/:id { pushSubscription, hasPushSubscription }`), which
 * is where the api-side push fan-outs look for it.
 *
 * Port of `@molecule/app-settings-panel-react`'s `NotificationsSection`. The
 * initial state reflects SERVER truth (the current device row's
 * `hasPushSubscription`), and every failure surfaces as an honest inline
 * message — a dev build without a service worker fails fast instead of hanging
 * the switch.
 */
@Component({
  selector: 'app-settings-notifications-section',
  standalone: true,
  imports: [MoleculeSwitch],
  template: `
    <section>
      <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">{{ t('settings.notifications') }}</h3>
      <div [class]="cm.flex({ align: 'center', justify: 'between' })">
        <span [class]="cm.textSize('sm')">{{ t('settings.pushNotifications') }}</span>
        <mol-switch
          [checked]="enabled"
          [disabled]="busy"
          size="sm"
          data-mol-id="settings-push-toggle"
          [attr.aria-label]="t('settings.pushNotifications')"
          (checkedChange)="handleToggle($event)"
        ></mol-switch>
      </div>
      @if (error) {
        <p
          [class]="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
          role="alert"
          data-mol-id="settings-push-error"
        >
          {{ error }}
        </p>
      }
    </section>
  `,
})
export class NotificationsSectionComponent implements OnInit, OnDestroy {
  private readonly http: HttpClient = inject(HTTP_CLIENT)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly push = createPushService()
  private disposed = false

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** Whether push is enabled for this device (server truth once loaded). */
  enabled = false
  /** Whether a toggle request is in flight. */
  busy = false
  /** The last failure message. */
  error: string | null = null

  ngOnInit(): void {
    // Server truth for THIS device; resolves false (never throws) when the
    // devices endpoint is unavailable.
    void readCurrentDevicePushEnabled(this.http).then((serverEnabled) => {
      if (!this.disposed && serverEnabled) {
        this.enabled = true
        this.cdr.markForCheck()
      }
    })
  }

  /**
   * Maps a failed toggle to its translated message.
   *
   * @param result - The typed failure.
   * @returns The message to show.
   */
  private failureMessage(result: Extract<PushToggleResult, { ok: false }>): string {
    switch (result.reason) {
      case 'permission-denied':
        return t('settings.pushPermissionDenied', undefined, {
          defaultValue: 'Notification permission was denied.',
        })
      case 'server-unconfigured':
        return t('settings.pushServerUnavailable', undefined, {
          defaultValue: 'Push notifications are not configured on this server.',
        })
      case 'register-failed':
        // The push provider throws already-localized messages (not supported /
        // no service worker in a dev build / push-service rejection).
        return (
          result.message ||
          t('settings.pushUpdateFailed', undefined, {
            defaultValue: 'Could not update push notification settings.',
          })
        )
      case 'persist-failed':
        return t('settings.pushUpdateFailed', undefined, {
          defaultValue: 'Could not update push notification settings.',
        })
    }
  }

  /**
   * Runs the full enable/disable chain for the next switch state.
   *
   * @param next - The switch's next state.
   */
  async handleToggle(next: boolean): Promise<void> {
    if (this.busy) return
    this.busy = true
    this.error = null
    try {
      if (next) {
        const result = await enablePushOnCurrentDevice({
          http: this.http,
          requestPermission: () => this.push.requestPermission(),
          register: (options) => this.push.register(options),
        })
        if (result.ok) {
          this.enabled = true
        } else {
          this.error = this.failureMessage(result)
        }
      } else {
        const result = await disablePushOnCurrentDevice({
          http: this.http,
          unregister: () => this.push.unregister(),
        })
        // The switch goes off locally either way; a failed server clear is
        // still reported so the user knows sends may continue.
        this.enabled = false
        if (!result.ok) this.error = this.failureMessage(result)
      }
    } finally {
      this.busy = false
      this.cdr.markForCheck()
    }
  }

  ngOnDestroy(): void {
    this.disposed = true
    this.push.destroy()
  }
}
