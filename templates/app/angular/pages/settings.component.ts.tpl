/**
 * Your settings: one native profile form over the app's bonded auth client.
 *
 * `createProfileForm` (components/settings-panel/profile-form.ts, the Angular
 * port of `@molecule/app-react`'s `useProfileForm`) owns the whole
 * load → edit → submit → publish lifecycle, so this page never seeds its
 * controls from a subscription on the user: that subscription is what erases a
 * typed bio or avatar when a background refresh lands, and the submit that
 * follows sends blanks. The form fills pristine fields when the signed-in user
 * arrives, keeps dirty controls, sends only the fields that changed, and
 * publishes the saved user to every session reader.
 *
 * The API's user resource answers a save with the CHANGED fields only
 * (`{ props: { bio } }`), which the scaffold's JWT auth client merges onto the
 * current signed-in profile before storing, publishing and returning it. The
 * form receives that merged profile too, so no page-level merge is needed.
 *
 * A password change is not part of this page: the user resource serves it from
 * its own route, so it lives in the header drawer's Authentication section.
 * Every string goes through `t()` with an inline English fallback; every
 * element a test drives carries `data-mol-id`. Control ids are generated per
 * instance, because the header drawer's account section is mounted over this
 * page and has its own name field.
 */
import { Component } from '@angular/core'

import { t } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { I18nError } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { createProfileForm } from '../components/settings-panel/profile-form.js'

/** The app's profile shape: the shared base fields plus the columns this app serves. */
interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/**
 * The controlled values this form edits; every one of them is a field an input
 * renders.
 */
type Fields = {
  name: string
  username: string
  bio: string
  avatar: string
}

const EMPTY: Fields = { name: '', username: '', bio: '', avatar: '' }

/** Monotonic id source so two settings forms on one page never collide. */
let nextSettingsFormId = 0

/**
 * Profile settings page (`/settings`).
 *
 * Port of the React `Settings` page: the same `section` frame, heading, native
 * form (`data-mol-id="settings-form"`), labelled controls with `data-mol-id`
 * hooks, save/cancel buttons and the inline save failure.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [],
  template: `
    <section [class]="cm.cn(cm.sp('py', 8), cm.sp('px', 4))">
      <h1 [class]="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))">
        {{ t('settings.title', undefined, { defaultValue: 'Your settings' }) }}
      </h1>
      <form [class]="cm.stack(4)" data-mol-id="settings-form" (submit)="onSubmit($event)">
        <div>
          <label [class]="cm.formLabelSmall" [attr.for]="fieldId('name')">
            {{ t('settings.name', undefined, { defaultValue: 'Name' }) }}
          </label>
          <input
            [attr.id]="fieldId('name')"
            [class]="cm.input()"
            autocomplete="name"
            data-mol-id="settings-name"
            [attr.name]="'name'"
            [value]="profile.values().name"
            (input)="profile.edit('name', valueOf($event))"
            (blur)="profile.blur('name')"
          />
        </div>
        <div>
          <label [class]="cm.formLabelSmall" [attr.for]="fieldId('username')">
            {{ t('settings.username', undefined, { defaultValue: 'Username' }) }}
          </label>
          <input
            [attr.id]="fieldId('username')"
            [class]="cm.input()"
            autocomplete="username"
            data-mol-id="settings-username"
            [attr.name]="'username'"
            [value]="profile.values().username"
            (input)="profile.edit('username', valueOf($event))"
            (blur)="profile.blur('username')"
          />
        </div>
        <div>
          <label [class]="cm.formLabelSmall" [attr.for]="fieldId('bio')">
            {{ t('settings.bio', undefined, { defaultValue: 'Bio' }) }}
          </label>
          <textarea
            [attr.id]="fieldId('bio')"
            [class]="cm.textarea()"
            [attr.rows]="4"
            data-mol-id="settings-bio"
            [attr.name]="'bio'"
            [value]="profile.values().bio"
            (input)="profile.edit('bio', valueOf($event))"
            (blur)="profile.blur('bio')"
          ></textarea>
        </div>
        <div>
          <label [class]="cm.formLabelSmall" [attr.for]="fieldId('avatar')">
            {{ t('settings.avatar', undefined, { defaultValue: 'Avatar URL' }) }}
          </label>
          <input
            [attr.id]="fieldId('avatar')"
            [class]="cm.input()"
            autocomplete="url"
            data-mol-id="settings-avatar"
            [attr.name]="'avatar'"
            [value]="profile.values().avatar"
            (input)="profile.edit('avatar', valueOf($event))"
            (blur)="profile.blur('avatar')"
          />
        </div>
        <div [class]="cm.sp('mt', 2)">
          <button
            type="submit"
            [class]="cm.button({ variant: 'solid' })"
            [disabled]="!profile.ready() || profile.isSubmitting()"
            data-mol-id="settings-save"
          >
            {{
              profile.isSubmitting()
                ? t('common.saving', undefined, { defaultValue: 'Saving...' })
                : t('settings.save', undefined, { defaultValue: 'Save changes' })
            }}
          </button>
          <button
            type="button"
            [class]="cm.cn(cm.button({ variant: 'ghost' }), cm.sp('ml', 2))"
            (click)="profile.reset()"
            data-mol-id="settings-cancel"
          >
            {{ t('settings.cancel', undefined, { defaultValue: 'Cancel' }) }}
          </button>
        </div>
        @if (profile.error()) {
          <p role="alert" [class]="cm.formError" data-mol-id="settings-error">
            {{
              t('settings.saveFailed', undefined, { defaultValue: 'Could not save your changes.' })
            }}{{ reason ? ' ' + reason : '' }}
          </p>
        }
      </form>
    </section>
  `,
})
export class SettingsComponent {
  private readonly instanceId = ++nextSettingsFormId

  /** The current class map. */
  get cm(): ReturnType<typeof getClassMap> {
    return getClassMap()
  }

  /** The reactive translation function (re-evaluates on locale change). */
  t = t

  /** The profile form state, over the injected auth client and session. */
  readonly profile = createProfileForm<AppUser, Fields>({
    defaultValues: EMPTY,
    toValues: (user) => ({
      name: user.name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
    }),
    toPatch: (changes) => changes,
  })

  /**
   * The translated reason behind a failed save.
   *
   * The auth client rejects a save with an `I18nError` (the server's reason
   * key), which this translates in the current locale.
   */
  get reason(): string {
    const failure = this.profile.error()
    if (!(failure instanceof Error)) return ''
    if (failure instanceof I18nError) {
      return t(failure.i18nKey, failure.i18nValues, { defaultValue: failure.message })
    }
    return failure.message
  }

  /**
   * The id of one of this form's controls.
   *
   * @param field - The field name.
   * @returns The unique control id.
   */
  fieldId(field: string): string {
    return `settings-${this.instanceId}-${field}`
  }

  /**
   * Reads the value of a native input or textarea event.
   *
   * @param event - The native input event.
   * @returns The typed value.
   */
  valueOf(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value
  }

  /**
   * Saves the changed profile fields.
   *
   * @param event - The native submit event (prevented: the page must not reload).
   */
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault()
    await this.profile.submit()
  }
}
