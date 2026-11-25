/**
 * Your settings: one native profile form over the app's bonded auth client.
 *
 * `useProfileForm` owns the whole load → edit → submit → publish lifecycle, so this page
 * never seeds its controls from the signed-in user as a side effect: that effect is what
 * erases a typed bio or avatar when a background refresh lands, and the submit that
 * follows sends blanks. The hook fills pristine fields when the signed-in user arrives,
 * keeps dirty controls, sends only the fields that changed, and publishes the saved user
 * to every `useAuth()`.
 *
 * The API's user resource answers a save with the CHANGED fields only (`{ props: { bio } }`),
 * which the scaffold's JWT auth client merges onto the current signed-in profile before
 * storing, publishing and returning it. The hook receives that merged profile too, so
 * no page-level merge is needed. Optional post-save work uses it for other caches/navigation.
 * A custom provider must return its saved profile; the hook does not merge raw deltas.
 *
 * Adapt it to this app's profile:
 * - widen `AppUser` and `Fields` with the app's own columns, and map them in `toValues`;
 * - map ONLY changed fields in `toPatch` (an omitted field stays omitted — never turn it
 *   into `null` unless the API requires that), and normalize nullable text to `''` in `toValues`;
 * - the write route and method come from `authConfig.profileEndpoint` /
 *   `profileUpdateMethod` in `src/config.ts` — change the API wiring THERE, not here.
 * - the React page accepts an optional `onSaved` prop; here a routed component receives
 *   none, so pass `onSaved` in this page's own `useProfileForm` call when you adapt it.
 *
 * A password change is not part of this page: the user resource serves it from its own
 * route, so put it in a security section with `useChangePassword`. Every string goes
 * through `t()` with an inline English fallback; every element a test drives carries
 * `data-mol-id`. Control ids are minted per instance (`nextInstanceId()`): the header
 * drawer's account section is mounted over this page and has its own name field.
 */
import { Component, computed } from '@angular/core'

import { useI18nError, useProfileForm, useTranslation } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { nextInstanceId } from '@molecule/app-ui-angular'

/** The app's profile shape: the shared base fields plus the columns this app serves. */
export interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/**
 * The controlled values this form edits; every one of them is a field an input renders.
 * A type alias or an interface can name these controlled values.
 */
type Fields = {
  name: string
  username: string
  bio: string
  avatar: string
}

const EMPTY: Fields = { name: '', username: '', bio: '', avatar: '' }

/**
 * Profile settings page (`/settings`).
 */
@Component({
  selector: 'app-settings',
  // No box of its own, like the React component it stands in for: a flex or grid parent
  // lays out this component's root element, not a wrapper.
  host: { style: 'display: contents' },
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
            [value]="nameValue()"
            (input)="nameReg.onChange($event)"
            (blur)="nameReg.onBlur()"
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
            [value]="usernameValue()"
            (input)="usernameReg.onChange($event)"
            (blur)="usernameReg.onBlur()"
          />
        </div>
        <div>
          <label [class]="cm.formLabelSmall" [attr.for]="fieldId('bio')">
            {{ t('settings.bio', undefined, { defaultValue: 'Bio' }) }}
          </label>
          <textarea
            [attr.id]="fieldId('bio')"
            [class]="cm.textarea()"
            rows="4"
            data-mol-id="settings-bio"
            [value]="bioValue()"
            (input)="bioReg.onChange($event)"
            (blur)="bioReg.onBlur()"
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
            [value]="avatarValue()"
            (input)="avatarReg.onChange($event)"
            (blur)="avatarReg.onBlur()"
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
              t('settings.saveFailed', undefined, {
                defaultValue: 'Could not save your changes.',
              })
            }}{{ reason() ? ' ' + reason() : '' }}
          </p>
        }
      </form>
    </section>
  `,
})
export class SettingsComponent {
  /** React's `useId()`: one id per instance, so two settings forms never collide. */
  private readonly instanceId = nextInstanceId()

  private readonly i18n = useTranslation()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm = getClassMap()

  /** The reactive translation function (re-evaluates on locale change). */
  protected readonly t = this.i18n.t

  /** The profile form state, over the injected auth client and session. */
  protected readonly profile = useProfileForm<AppUser, Fields>({
    defaultValues: EMPTY,
    toValues: (user) => ({
      name: user.name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
    }),
    toPatch: (changes) => changes,
  })

  /** The name field's registration (its onChange marks the field edited). */
  protected readonly nameReg = this.profile.register('name')
  /** The username field's registration. */
  protected readonly usernameReg = this.profile.register('username')
  /** The bio field's registration. */
  protected readonly bioReg = this.profile.register('bio')
  /** The avatar field's registration. */
  protected readonly avatarReg = this.profile.register('avatar')

  /** The name field's controlled value (form state is the change signal). */
  protected readonly nameValue = computed(() => {
    void this.profile.formState()
    return this.profile.getValue('name')
  })

  /** The username field's controlled value. */
  protected readonly usernameValue = computed(() => {
    void this.profile.formState()
    return this.profile.getValue('username')
  })

  /** The bio field's controlled value. */
  protected readonly bioValue = computed(() => {
    void this.profile.formState()
    return this.profile.getValue('bio')
  })

  /** The avatar field's controlled value. */
  protected readonly avatarValue = computed(() => {
    void this.profile.formState()
    return this.profile.getValue('avatar')
  })

  /**
   * The translated reason behind a failed save. `profile.error` is `unknown`; the
   * auth client rejects a save with an `I18nError` (the server's reason key),
   * which this translates in the current locale — React's `useI18nError` with
   * the error as its (signal) argument, so the text follows locale changes.
   */
  protected readonly reason = useI18nError(
    computed(() => {
      const failure = this.profile.error()
      return failure instanceof Error ? failure : null
    }),
  )

  /**
   * The id of one of this form's controls.
   *
   * @param field - The field name.
   * @returns The unique control id.
   */
  protected fieldId(field: string): string {
    return `${this.instanceId}-${field}`
  }

  /**
   * Saves the changed profile fields (React's `profile.formProps` onSubmit).
   *
   * @param event - The native submit event (prevented by the form hook).
   */
  protected onSubmit(event: Event): void {
    this.profile.formProps.onSubmit(event)
  }
}
