import { Component, EventEmitter, Output, type OnInit, type OnDestroy, inject } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { Router } from '@angular/router'
import {
  AUTH_CLIENT,
  MoleculeAuthService,
  createChangePasswordState,
  t,
} from '@molecule/app-angular'
import {
  MoleculeButton,
  MoleculeInput,
  MoleculeSwitch,
  MoleculeAlert,
  MoleculeModal,
} from '@molecule/app-ui-angular'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { FooterComponent } from './footer.component.js'
import { IconComponent } from './icon.component.js'

interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
}

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [
    AsyncPipe,
    MoleculeButton,
    MoleculeInput,
    MoleculeSwitch,
    MoleculeAlert,
    MoleculeModal,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <div [class]="panelClasses">
      <!-- Account -->
      <section>
        <div [class]="sectionHeaderClasses">
          <h3 [class]="sectionTitleClasses">{{ t('settings.account') }}</h3>
          @if (emailSaving) {
            <span [class]="savingClasses">{{ t('common.saving') }}</span>
          }
        </div>
        <div>
          <label for="settings-email" [class]="cm.formLabelSmall"
            >{{ t('settings.email') }}</label
          >
          <mol-input
            id="settings-email"
            type="email"
            size="sm"
            [value]="email"
            (handleInput)="onEmailInput($event)"
            (handleBlur)="handleEmailBlur()"
          ></mol-input>
          @if (emailError) {
            <p [class]="emailErrorClasses">{{ emailError }}</p>
          }
        </div>
      </section>

      <!-- Authentication (hidden for OAuth users) -->
      @if (!isOAuthUser) {
        <section>
          <h3 [class]="sectionTitleWithMargin">{{ t('settings.authentication') }}</h3>
          <div [class]="cm.stack(3)">
            <mol-button
              variant="outline"
              size="sm"
              (handleClick)="showPasswordModal = true"
            >
              {{ t('settings.changePassword') }}
            </mol-button>
            <div [class]="rowClasses">
              <span [class]="cm.textSize('sm')">{{ t('settings.twoFactor') }}</span>
              <mol-switch
                [checked]="twoFactorEnabled"
                (handleChange)="handleToggle2FA($event)"
                [disabled]="twoFactorLoading"
                size="sm"
              ></mol-switch>
            </div>
          </div>
        </section>
      }

      <!-- Notifications -->
      <section>
        <h3 [class]="sectionTitleWithMargin">{{ t('settings.notifications') }}</h3>
        <div [class]="rowClasses">
          <span [class]="cm.textSize('sm')">{{ t('settings.pushNotifications') }}</span>
          <mol-switch
            [checked]="pushEnabled"
            (handleChange)="handleTogglePush($event)"
            size="sm"
          ></mol-switch>
        </div>
      </section>

      <!-- Billing -->
      <section>
        <h3 [class]="sectionTitleWithMargin">{{ t('settings.billing') }}</h3>
        <div [class]="rowClasses">
          <span [class]="cm.textSize('sm')"
            >{{ t('settings.plan') }}: <strong>{{ plan }}</strong></span
          >
          <mol-button variant="outline" size="sm">{{ t('settings.upgrade') }}</mol-button>
        </div>
      </section>

      <!-- Devices -->
      <section>
        <div [class]="sectionHeaderClasses">
          <h3 [class]="sectionTitleClasses">{{ t('settings.devices') }}</h3>
          @if (devicesLoading) {
            <span [class]="savingClasses">{{ t('common.loading') }}</span>
          }
        </div>
        @if (devices.length > 0) {
          <ul [class]="cm.stack(2)">
            @for (device of devices; track device.id) {
              <li [class]="deviceRowClasses">
                <span>{{ device.name || device.platform }}</span>
                <app-icon name="chevron-right" [size]="16" [iconClass]="cm.textSubtle" />
              </li>
            }
          </ul>
        } @else if (!devicesLoading) {
          <p [class]="noDevicesClasses">{{ t('settings.noDevices') }}</p>
        }
      </section>

      <!-- This Device -->
      <section>
        <h3 [class]="sectionTitleWithMargin">{{ t('settings.thisDevice') }}</h3>
        <dl [class]="deviceInfoClasses">
          <div [class]="infoRowClasses">
            <dt [class]="cm.textMuted">{{ t('settings.platform') }}</dt>
            <dd>{{ devicePlatform }}</dd>
          </div>
          <div [class]="infoRowClasses">
            <dt [class]="cm.textMuted">{{ t('settings.browser') }}</dt>
            <dd>{{ deviceBrowser }}</dd>
          </div>
          <div [class]="infoRowClasses">
            <dt [class]="cm.textMuted">{{ t('settings.network') }}</dt>
            <dd>{{ networkStatus }}</dd>
          </div>
        </dl>
      </section>

      <div [class]="cm.dividerLine"></div>

      <!-- Actions -->
      <section [class]="cm.stack(3)">
        <mol-button color="error" [fullWidth]="true" (handleClick)="handleLogout()">
          {{ t('settings.logOut') }}
        </mol-button>
        <mol-button
          variant="ghost"
          [fullWidth]="true"
          (handleClick)="showDeleteModal = true"
        >
          {{ t('settings.deleteAccount') }}
        </mol-button>
      </section>

      <app-footer />

      <!-- Password Change Modal -->
      <mol-modal [open]="showPasswordModal" [title]="t('settings.changePasswordModal.title')" (close)="closePasswordModal()">
        @if (pwState$ | async; as pwState) {
          @if (pwState.error) {
            <mol-alert status="error" [className]="cm.sp('mb', 4)">
              {{ pwState.error.message || t('settings.changePasswordModal.error') }}
            </mol-alert>
          }
        }
        <form (ngSubmit)="handlePasswordChange()" [class]="cm.stack(4)">
          <div>
            <label for="current-pw" [class]="cm.formLabel">{{ t('settings.changePasswordModal.currentPassword') }}</label>
            <mol-input
              id="current-pw"
              type="password"
              [value]="currentPassword"
              (handleInput)="currentPassword = $any($event).target.value"
              autocomplete="current-password"
              [required]="true"
            ></mol-input>
          </div>
          <div>
            <label for="new-pw" [class]="cm.formLabel">{{ t('settings.changePasswordModal.newPassword') }}</label>
            <mol-input
              id="new-pw"
              type="password"
              [value]="newPassword"
              (handleInput)="newPassword = $any($event).target.value"
              autocomplete="new-password"
              [required]="true"
            ></mol-input>
          </div>
          <mol-button type="submit" [fullWidth]="true" [loading]="pwPending">
            {{ pwPending ? t('settings.changePasswordModal.changing') : t('settings.changePassword') }}
          </mol-button>
        </form>
      </mol-modal>

      <!-- Delete Account Modal -->
      <mol-modal [open]="showDeleteModal" [title]="t('settings.deleteAccountModal.title')" (close)="showDeleteModal = false">
        <p [class]="deleteWarningClasses">
          {{ t('settings.deleteAccountModal.warning') }}
        </p>
        @if (deleteError) {
          <mol-alert status="error" [className]="cm.sp('mb', 4)">{{ deleteError }}</mol-alert>
        }
        <form (ngSubmit)="handleDeleteAccount()" [class]="cm.stack(4)">
          <div>
            <label for="delete-pw" [class]="cm.formLabel">{{ t('settings.deleteAccountModal.password') }}</label>
            <mol-input
              id="delete-pw"
              type="password"
              [value]="deletePassword"
              (handleInput)="deletePassword = $any($event).target.value"
              [required]="true"
            ></mol-input>
          </div>
          <mol-button type="submit" color="error" [fullWidth]="true" [loading]="deleteLoading">
            {{ deleteLoading ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount') }}
          </mol-button>
        </form>
      </mol-modal>
    </div>
  `,
})
export class SettingsPanelComponent implements OnInit, OnDestroy {
  @Output() closePanel = new EventEmitter<void>()

  private authClient = inject(AUTH_CLIENT)
  private authService = inject(MoleculeAuthService)
  private router = inject(Router)
  private http = getHttpClient()
  private pwManager = createChangePasswordState(this.authClient)

  get cm(): ReturnType<typeof getClassMap> { return getClassMap() }
  t = t
  get panelClasses(): string { return this.cm.cn(this.cm.sp('p', 6), this.cm.stack(6)) }
  get sectionTitleClasses(): string { return this.cm.sectionHeading }
  get sectionTitleWithMargin(): string { return this.cm.cn(this.cm.sectionHeading, this.cm.sp('mb', 3)) }
  get sectionHeaderClasses(): string {
    return this.cm.cn(
      this.cm.flex({ align: 'center', gap: 'sm' }),
      this.cm.sp('mb', 3),
    )
  }
  get rowClasses(): string { return this.cm.flex({ align: 'center', justify: 'between' }) }
  get deviceRowClasses(): string {
    return this.cm.cn(
      this.cm.flex({ align: 'center', justify: 'between' }),
      this.cm.textSize('sm'),
      this.cm.sp('py', 1),
    )
  }
  get infoRowClasses(): string { return this.cm.flex({ justify: 'between' }) }
  get savingClasses(): string { return this.cm.cn(this.cm.textSize('xs'), this.cm.textSubtle) }
  get emailErrorClasses(): string { return this.cm.cn(this.cm.textSize('xs'), this.cm.textError, this.cm.sp('mt', 1)) }
  get noDevicesClasses(): string { return this.cm.cn(this.cm.textSize('sm'), this.cm.textMuted) }
  get deviceInfoClasses(): string { return this.cm.cn(this.cm.stack(1), this.cm.textSize('sm')) }
  get deleteWarningClasses(): string {
    return this.cm.cn(
      this.cm.textSize('sm'),
      this.cm.textMuted,
      this.cm.sp('mb', 4),
    )
  }

  user$ = this.authService.user$
  pwState$ = this.pwManager.state$

  // Account
  email = ''
  emailSaving = false
  emailError = ''
  isOAuthUser = false

  // Password
  showPasswordModal = false
  currentPassword = ''
  newPassword = ''
  pwPending = false

  // 2FA
  twoFactorEnabled = false
  twoFactorLoading = false

  // Devices
  devices: Device[] = []
  devicesLoading = true

  // Plan
  plan = 'Free'

  // Delete
  showDeleteModal = false
  deletePassword = ''
  deleteLoading = false
  deleteError = ''

  // Push
  pushEnabled = false

  // Device info
  devicePlatform = t('settings.unknown')
  deviceBrowser = t('settings.unknown')
  get networkStatus(): string { return typeof navigator !== 'undefined' && navigator.onLine ? t('settings.online') : t('settings.offline') }

  private userId = ''
  private userSub: { unsubscribe(): void } | null = null

  ngOnInit(): void {
    this.userSub = this.authService.user$.subscribe((user) => {
      if (user) {
        this.email = user.email || ''
        this.userId = (user as Record<string, unknown>).id as string || ''
        this.isOAuthUser = !!(user as Record<string, unknown>).oauthServer
      }
    })
    this.loadDevices()
    this.detectDevice()

    this.pwManager.state$.subscribe((state) => {
      this.pwPending = state.status === 'pending'
    })
  }

  onEmailInput(event: Event): void {
    this.email = (event.target as HTMLInputElement).value
  }

  async handleEmailBlur(): Promise<void> {
    const user = this.authService.currentUser
    if (this.email === user?.email || !this.email) return
    this.emailSaving = true
    this.emailError = ''
    try {
      await this.http.patch(`/users/${this.userId}`, { data: { email: this.email } })
    } catch (err) {
      this.emailError = err instanceof Error ? err.message : t('settings.failedToUpdateEmail')
      this.email = user?.email || ''
    } finally {
      this.emailSaving = false
    }
  }

  async handlePasswordChange(): Promise<void> {
    try {
      await this.pwManager.changePassword(this.currentPassword, this.newPassword)
      this.closePasswordModal()
    } catch {
      // Error tracked in state
    }
  }

  closePasswordModal(): void {
    this.showPasswordModal = false
    this.currentPassword = ''
    this.newPassword = ''
  }

  async handleToggle2FA(event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked
    this.twoFactorLoading = true
    try {
      await this.http.patch(`/users/${this.userId}`, {
        data: { twoFactorEnabled: enabled },
      })
      this.twoFactorEnabled = enabled
    } catch {
      // Revert on failure
    } finally {
      this.twoFactorLoading = false
    }
  }

  async handleTogglePush(event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked
    try {
      if (enabled) {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            this.pushEnabled = true
          }
        }
      } else {
        this.pushEnabled = false
      }
    } catch {
      // Permission may be denied
    }
  }

  async handleLogout(): Promise<void> {
    await this.authService.logout()
    this.closePanel.emit()
    this.router.navigate(['/login'])
  }

  async handleDeleteAccount(): Promise<void> {
    this.deleteLoading = true
    this.deleteError = ''
    try {
      await this.http.delete(`/users/${this.userId}`, {
        data: { password: this.deletePassword },
      })
      await this.authService.logout()
      this.closePanel.emit()
      this.router.navigate(['/login'])
    } catch (err) {
      this.deleteError =
        err instanceof Error ? err.message : t('settings.failedToDeleteAccount')
    } finally {
      this.deleteLoading = false
    }
  }

  ngOnDestroy(): void {
    this.pwManager.destroy()
    this.userSub?.unsubscribe()
  }

  private async loadDevices(): Promise<void> {
    try {
      const response = await this.http.get<{ data: Device[] }>('/devices')
      this.devices = response.data.data || []
    } catch {
      // Devices may not be available
    } finally {
      this.devicesLoading = false
    }
  }

  private detectDevice(): void {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua)) this.devicePlatform = 'iOS'
    else if (/Android/.test(ua)) this.devicePlatform = 'Android'
    else if (/Mac/.test(ua)) this.devicePlatform = 'macOS'
    else if (/Win/.test(ua)) this.devicePlatform = 'Windows'
    else if (/Linux/.test(ua)) this.devicePlatform = 'Linux'

    if (/Chrome/.test(ua) && !/Edg/.test(ua)) this.deviceBrowser = 'Chrome'
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) this.deviceBrowser = 'Safari'
    else if (/Firefox/.test(ua)) this.deviceBrowser = 'Firefox'
    else if (/Edg/.test(ua)) this.deviceBrowser = 'Edge'
  }
}
