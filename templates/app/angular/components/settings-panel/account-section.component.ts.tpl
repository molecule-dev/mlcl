import { Component, inject } from '@angular/core'
import type { AuthClient, UserProfile } from '@molecule/app-auth'
import { AUTH_CLIENT, t } from '@molecule/app-angular'
import { MoleculeSpinner } from '@molecule/app-ui-angular'
import { getClassMap } from '@molecule/app-ui'
import { createProfileForm } from './profile-form.js'

/** The account fields this section edits. */
type AccountValues = {
  name: string
  email: string
}

/**
 * Account fields over the shared profile lifecycle.
 *
 * Port of `@molecule/app-settings-panel-react`'s `AccountSection`: background
 * validation uses the auth client's configured route, mapping and session
 * ownership guards, and each field saves the profile when it loses focus.
 *
 * `UserProfile.email` is optional (phone/handle accounts have none), so email is
 * validated only when non-empty and a blank email is never sent: clearing the
 * field leaves the stored address untouched, and a name-only account can still
 * save its name.
 */
@Component({
  selector: 'app-settings-account-section',
  standalone: true,
  imports: [MoleculeSpinner],
  template: `
    <section>
      <div [class]="cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 3))">
        <h3 [class]="cm.sectionHeading">{{ t('settings.account') }}</h3>
        @if (profile.isSubmitting()) {
          <mol-spinner size="xs" />
        }
      </div>
      <form [class]="cm.stack(3)" (submit)="onSubmit($event)">
        <div>
          <label for="settings-name" [class]="cm.formLabelSmall">
            {{ t('settings.name', undefined, { defaultValue: 'Name' }) }}
          </label>
          <!-- A native input rather than the UI package's Input: this field's
              name association and invalid state are load-bearing, and the
              installed Input cannot forward arbitrary aria-* onto the native
              element (see the scaffold report). -->
          <div [class]="cm.inputWrapper">
            <input
              id="settings-name"
              name="name"
              type="text"
              [class]="cm.input({ size: 'sm' })"
              autocomplete="name"
              [value]="profile.values().name"
              (input)="profile.edit('name', valueOf($event))"
              (blur)="saveOnBlur('name')"
            />
          </div>
        </div>
        <div>
          <label for="settings-email" [class]="cm.formLabelSmall">
            {{ t('settings.email') }}
          </label>
          <div [class]="cm.inputWrapper">
            <input
              id="settings-email"
              name="email"
              type="email"
              [class]="cm.input({ size: 'sm' })"
              autocomplete="email"
              [value]="profile.values().email"
              [attr.aria-invalid]="emailError ? 'true' : null"
              [attr.aria-describedby]="emailError ? 'settings-email-error' : null"
              (input)="profile.edit('email', valueOf($event))"
              (blur)="saveOnBlur('email')"
            />
          </div>
          @if (emailError) {
            <p
              id="settings-email-error"
              role="alert"
              [class]="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
            >
              {{ emailError }}
            </p>
          }
          @if (profile.error()) {
            <p role="alert" [class]="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))">
              {{ saveErrorText }}
            </p>
          }
        </div>
      </form>
    </section>
  `,
})
export class AccountSectionComponent {
  private readonly authClient = inject(AUTH_CLIENT) as AuthClient<UserProfile>

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The account form (name + email) over the bonded auth client. */
  readonly profile = createProfileForm<UserProfile, AccountValues>({
    defaultValues: { name: '', email: '' },
    toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
    validators: { email: { email: true } },
  })

  constructor() {
    // The auth client owns the route, response mapping and stale-read guards. An
    // older account read must not publish over a save or a different session.
    void this.authClient.validateSession?.().catch((_error: unknown) => {
      // A provider's background validation must not cause an unhandled rejection:
      // render its auth state while the profile form reports mutation failures.
    })
  }

  /** The field-level email validation message, when invalid. */
  get emailError(): string | undefined {
    return this.profile.errors()['email']
  }

  /** The save failure text shown under the email field. */
  get saveErrorText(): string {
    const failure = this.profile.error()
    if (failure instanceof Error) return failure.message
    return t('settings.failedToUpdateProfile', undefined, {
      defaultValue: 'Failed to update profile',
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

  /**
   * Re-validates the blurred field, then saves the whole profile form.
   *
   * @param field - The field that lost focus.
   */
  saveOnBlur(field: 'name' | 'email'): void {
    this.profile.blur(field)
    void this.profile.submit()
  }

  /**
   * Saves the changed fields (the form's submit path).
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    await this.profile.submit()
  }
}
