import { ChangeDetectorRef, Component, inject, type OnDestroy, type OnInit } from '@angular/core'
import type { Subscription } from 'rxjs'

import {
  AUTH_CLIENT,
  createChangePasswordState,
  MoleculeAuthService,
  t,
} from '@molecule/app-angular'
import { HTTP_CLIENT } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { MoleculeAlert, MoleculeModal } from '@molecule/app-ui-angular'

import { ButtonComponent } from '../button.component.js'

/** The enrollment payload the user resource's verify-two-factor route returns. */
interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * Authentication section — change password (modal) + two-factor (TOTP) setup.
 *
 * Port of `@molecule/app-settings-panel-react`'s `AuthSection`. Two-factor uses
 * the real enrollment flow against the user resource's
 * `POST /users/:id/verify-two-factor` endpoint: enable returns a QR code + secret
 * to scan into an authenticator app, then a 6-digit code enables it; disable
 * asks for a current code. The current status is read from `/users/me`.
 *
 * Auto-hides for OAuth-only users (`user.oauthServer` truthy) since password /
 * 2FA would not apply. If the app's API has no two-factor provider bonded, setup
 * fails gracefully with an inline message.
 */
@Component({
  selector: 'app-settings-auth-section',
  standalone: true,
  imports: [ButtonComponent, MoleculeAlert, MoleculeModal],
  template: `
    @if (!isOAuthUser) {
      <section>
        <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
          {{ t('settings.authentication') }}
        </h3>
        <div [class]="cm.stack(3)">
          <button appButton variant="outline" size="sm" (click)="showModal = true">
            {{ t('settings.changePassword') }}
          </button>
          <div [class]="cm.flex({ align: 'center', justify: 'between' })">
            <span [class]="cm.textSize('sm')">
              {{ t('settings.twoFactor') }}
              @if (twoFactorEnabled) {
                <span [class]="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))">
                  {{ t('settings.twoFactorOn', undefined, { defaultValue: 'On' }) }}
                </span>
              }
            </span>
            @if (twoFactorEnabled) {
              <button
                appButton
                variant="outline"
                size="sm"
                data-mol-id="two-factor-disable"
                (click)="openDisable()"
              >
                {{ t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' }) }}
              </button>
            } @else {
              <button
                appButton
                variant="outline"
                size="sm"
                data-mol-id="two-factor-enable"
                (click)="startEnable()"
              >
                {{ t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' }) }}
              </button>
            }
          </div>
        </div>
      </section>

      <mol-modal
        [open]="showModal"
        [title]="t('settings.changePasswordModal.title')"
        (close)="closePasswordModal()"
      >
        @if (passwordError) {
          <mol-alert status="error" [className]="cm.sp('mb', 4)">
            {{ passwordError.message || t('settings.changePasswordModal.error') }}
          </mol-alert>
        }
        <form [class]="cm.stack(4)" (submit)="handleChangePassword($event)">
          <div>
            <label for="current-pw" [class]="cm.formLabel">
              {{ t('settings.changePasswordModal.currentPassword') }}
            </label>
            <!-- A native input rather than the UI package's Input: the host
                element would carry the same id as the inner control, so the
                label would resolve to the host instead of the input (see the
                scaffold report). -->
            <div [class]="cm.inputWrapper">
              <input
                id="current-pw"
                type="password"
                [class]="cm.input()"
                [value]="currentPassword"
                (input)="currentPassword = valueOf($event)"
                autocomplete="current-password"
                required
                aria-invalid="false"
              />
            </div>
          </div>
          <div>
            <label for="new-pw" [class]="cm.formLabel">
              {{ t('settings.changePasswordModal.newPassword') }}
            </label>
            <div [class]="cm.inputWrapper">
              <input
                id="new-pw"
                type="password"
                [class]="cm.input()"
                [value]="newPassword"
                (input)="newPassword = valueOf($event)"
                autocomplete="new-password"
                required
                aria-invalid="false"
              />
            </div>
          </div>
          <button appButton type="submit" [fullWidth]="true" [loading]="passwordPending">
            {{
              passwordPending
                ? t('settings.changePasswordModal.changing')
                : t('settings.changePassword')
            }}
          </button>
        </form>
      </mol-modal>

      <mol-modal [open]="tfModal !== null" [title]="tfTitle" (close)="closeTf()">
        @if (tfError) {
          <mol-alert status="error" [className]="cm.sp('mb', 4)">{{ tfError }}</mol-alert>
        }
        @if (tfModal === 'enable' && tfSetup?.QRImageUrl) {
          <div [class]="cm.cn(cm.stack(3), cm.sp('mb', 4))">
            <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">
              {{
                t('settings.twoFactorScan', undefined, {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                })
              }}
            </p>
            <img
              [src]="tfSetup?.QRImageUrl"
              [attr.alt]="
                t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })
              "
              [class]="cm.cn(cm.mxAuto, cm.maxW('xs'))"
            />
            @if (tfSetup?.secret) {
              <p [class]="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.settingsPanelTwoFactorSecret)">
                {{ tfSetup?.secret }}
              </p>
            }
          </div>
        }
        @if (tfModal === 'disable' || tfSetup) {
          <form [class]="cm.stack(4)" (submit)="submitTf($event)">
            <div>
              <label for="tf-token" [class]="cm.formLabel">
                {{
                  t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })
                }}
              </label>
              <div [class]="cm.inputWrapper">
                <input
                  id="tf-token"
                  type="text"
                  [class]="cm.input()"
                  [value]="tfToken"
                  (input)="tfToken = valueOf($event)"
                  autocomplete="one-time-code"
                  required
                  aria-invalid="false"
                />
              </div>
            </div>
            <button
              appButton
              type="submit"
              [color]="tfModal === 'disable' ? 'error' : 'primary'"
              [fullWidth]="true"
              [loading]="tfLoading"
            >
              {{
                tfModal === 'disable'
                  ? t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })
                  : t('settings.twoFactorVerify', undefined, { defaultValue: 'Verify & enable' })
              }}
            </button>
          </form>
        }
      </mol-modal>
    }
  `,
})
export class AuthSectionComponent implements OnInit, OnDestroy {
  private readonly authService: MoleculeAuthService<UserProfile> = inject(MoleculeAuthService)
  private readonly http: HttpClient = inject(HTTP_CLIENT)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly passwordManager = createChangePasswordState(inject(AUTH_CLIENT))
  private readonly subscriptions: Subscription[] = []

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** Whether the signed-in account signs in through an OAuth provider. */
  isOAuthUser = false
  /** The signed-in account's id. */
  userId = ''

  /** Whether the change-password modal is open. */
  showModal = false
  /** The current password field. */
  currentPassword = ''
  /** The new password field. */
  newPassword = ''
  /** Whether a password change is in flight. */
  passwordPending = false
  /** The last password-change failure. */
  passwordError: Error | null = null

  /** The two-factor modal's mode (`null` when closed). */
  tfModal: 'enable' | 'disable' | null = null
  /** The enrollment payload from the enable step. */
  tfSetup: TwoFactorSetup | null = null
  /** The 6-digit code field. */
  tfToken = ''
  /** Whether the accepted status is enabled. */
  twoFactorEnabled = false
  /** Whether a two-factor request is in flight. */
  tfLoading = false
  /** The last two-factor failure. */
  tfError = ''

  ngOnInit(): void {
    this.subscriptions.push(
      this.authService.user$.subscribe((user) => {
        this.isOAuthUser = !!(user as { oauthServer?: string } | null)?.oauthServer
        this.userId = (user as { id?: string } | null)?.id ?? ''
        this.cdr.markForCheck()
      }),
      this.passwordManager.state$.subscribe((state) => {
        this.passwordPending = state.status === 'pending'
        this.passwordError = state.error ?? null
        this.cdr.markForCheck()
      }),
    )
    // Read the persisted two-factor status from /users/me on mount.
    void this.readTwoFactorStatus()
  }

  /** The two-factor modal's title. */
  get tfTitle(): string {
    return this.tfModal === 'disable'
      ? t('settings.twoFactorDisableTitle', undefined, {
          defaultValue: 'Disable two-factor authentication',
        })
      : t('settings.twoFactorEnableTitle', undefined, {
          defaultValue: 'Enable two-factor authentication',
        })
  }

  /**
   * Reads the value of a native input event.
   *
   * @param event - The native input event.
   * @returns The typed value.
   */
  valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value
  }

  /** Starts two-factor enrollment and opens its modal. */
  async startEnable(): Promise<void> {
    this.tfError = ''
    this.tfLoading = true
    this.tfModal = 'enable'
    try {
      const response = await this.http.post<TwoFactorSetup & { data?: TwoFactorSetup }>(
        `/api/users/${this.userId}/verify-two-factor`,
        { action: 'setup' },
      )
      const body = response.data
      this.tfSetup = body.data ?? body
    } catch (error) {
      this.tfError =
        error instanceof Error
          ? error.message
          : t('settings.twoFactorUnavailable', undefined, {
              defaultValue: 'Two-factor authentication is not available for this app.',
            })
    } finally {
      this.tfLoading = false
      this.cdr.markForCheck()
    }
  }

  /** Opens the disable modal with a clean code field. */
  openDisable(): void {
    this.tfError = ''
    this.tfToken = ''
    this.tfModal = 'disable'
  }

  /**
   * Submits the enable or disable step with the entered code.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async submitTf(event: Event): Promise<void> {
    event.preventDefault()
    const action: 'enable' | 'disable' = this.tfModal === 'disable' ? 'disable' : 'enable'
    this.tfError = ''
    this.tfLoading = true
    try {
      await this.http.post(`/api/users/${this.userId}/verify-two-factor`, {
        action,
        token: this.tfToken,
      })
      this.twoFactorEnabled = action === 'enable'
      this.closeTf()
    } catch (error) {
      this.tfError =
        error instanceof Error
          ? error.message
          : t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' })
    } finally {
      this.tfLoading = false
      this.cdr.markForCheck()
    }
  }

  /** Closes and resets the two-factor modal. */
  closeTf(): void {
    this.tfModal = null
    this.tfSetup = null
    this.tfToken = ''
    this.tfError = ''
  }

  /**
   * Changes the password, closing the modal on success.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async handleChangePassword(event: Event): Promise<void> {
    event.preventDefault()
    try {
      await this.passwordManager.changePassword(this.currentPassword, this.newPassword)
      this.showModal = false
      this.currentPassword = ''
      this.newPassword = ''
      this.passwordManager.reset()
    } catch (_error) {
      // Error tracked in the change-password state and rendered in the modal.
    }
  }

  /** Closes the change-password modal and clears its failure. */
  closePasswordModal(): void {
    this.showModal = false
    this.passwordManager.reset()
  }

  /** Reads whether two-factor is enabled for the signed-in account. */
  private async readTwoFactorStatus(): Promise<void> {
    try {
      const response = await this.http.get<{
        props?: { twoFactorEnabled?: boolean }
        twoFactorEnabled?: boolean
      }>('/api/users/me')
      const body = response.data
      const account = body.props ?? body
      this.twoFactorEnabled = Boolean(account.twoFactorEnabled)
    } catch (_error) {
      // Status read is best-effort; the section defaults to disabled.
    } finally {
      this.cdr.markForCheck()
    }
  }

  ngOnDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe()
    this.passwordManager.destroy()
  }
}
