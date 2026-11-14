import { ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core'
import { Router } from '@angular/router'

import { HTTP_CLIENT, MoleculeAuthService, t } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { Button, MoleculeAlert, MoleculeModal } from '@molecule/app-ui-angular'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Port of `@molecule/app-settings-panel-react`'s `LogOutDeleteSection`: it owns
 * the delete-account modal (the trigger lives in the same section), emits
 * `closePanel` to dismiss the drawer after either action, and navigates to
 * `/login`.
 */
@Component({
  selector: 'app-settings-log-out-delete-section',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
  standalone: true,
  imports: [Button, MoleculeAlert, MoleculeModal],
  template: `
    <section [class]="cm.stack(3)">
      <button
        mol-button
        color="error"
        [fullWidth]="true"
        data-mol-id="user-menu-logout"
        (click)="handleLogout()"
      >
        {{ t('settings.logOut', undefined, { defaultValue: 'Sign out' }) }}
      </button>
      <button
        mol-button
        variant="ghost"
        [fullWidth]="true"
        data-mol-id="user-menu-delete-account"
        (click)="showModal = true"
      >
        {{ t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }) }}
      </button>
    </section>

    <mol-modal
      [open]="showModal"
      [title]="t('settings.deleteAccountModal.title')"
      (close)="showModal = false"
    >
      <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))">
        {{ t('settings.deleteAccountModal.warning') }}
      </p>
      @if (error) {
        <mol-alert status="error" [className]="cm.sp('mb', 4)">{{ error }}</mol-alert>
      }
      <form [class]="cm.stack(4)" (submit)="handleDelete($event)">
        <div>
          <label for="delete-pw" [class]="cm.formLabel">
            {{ t('settings.deleteAccountModal.password') }}
          </label>
          <div [class]="cm.inputWrapper">
            <input
              id="delete-pw"
              type="password"
              [class]="cm.input()"
              [value]="password"
              (input)="password = valueOf($event)"
              required
              aria-invalid="false"
            />
          </div>
        </div>
        <button mol-button type="submit" color="error" [fullWidth]="true" [loading]="loading">
          {{ loading ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount') }}
        </button>
      </form>
    </mol-modal>
  `,
})
export class LogOutDeleteSectionComponent {
  /** Emits when the settings drawer should be dismissed. */
  @Output() readonly closePanel = new EventEmitter<void>()

  private readonly authService: MoleculeAuthService<UserProfile> = inject(MoleculeAuthService)
  private readonly http: HttpClient = inject(HTTP_CLIENT)
  private readonly router = inject(Router)
  private readonly cdr = inject(ChangeDetectorRef)

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** Whether the delete-account modal is open. */
  showModal = false
  /** The confirmation password field. */
  password = ''
  /** Whether a delete request is in flight. */
  loading = false
  /** The last delete failure. */
  error = ''

  /**
   * Reads the value of a native input event.
   *
   * @param event - The native input event.
   * @returns The typed value.
   */
  valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value
  }

  /** Signs the user out, closes the drawer and returns to the login page. */
  async handleLogout(): Promise<void> {
    await this.authService.logout()
    this.closePanel.emit()
    await this.router.navigate(['/login'])
  }

  /**
   * Deletes the account, signs out, closes the drawer and returns to login.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async handleDelete(event: Event): Promise<void> {
    event.preventDefault()
    this.loading = true
    this.error = ''
    try {
      const user = this.authService.user
      await this.http.delete(`/api/users/${user?.id}`, { data: { password: this.password } })
      await this.authService.logout()
      this.closePanel.emit()
      await this.router.navigate(['/login'])
    } catch (error) {
      this.error = error instanceof Error ? error.message : t('settings.failedToDeleteAccount')
    } finally {
      this.loading = false
      this.cdr.markForCheck()
    }
  }
}
