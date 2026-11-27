<script lang="ts">
/**
 * Your settings: one native profile form over the app's bonded auth client.
 *
 * `useProfileForm` owns the whole load → edit → submit → publish lifecycle, so this page
 * never seeds its controls from a watcher on the user: that watcher is what erases a typed
 * bio or avatar when a background refresh lands, and the submit that follows sends blanks.
 * The hook fills pristine fields when the signed-in user arrives, keeps dirty controls,
 * sends only the fields that changed, and publishes the saved user to every `useAuth()`.
 *
 * The API's user resource answers a save with the CHANGED fields only (`{ props: { bio } }`),
 * which the scaffold's JWT auth client merges onto the current signed-in profile before
 * storing, publishing and returning it. The hook receives that merged profile too, so
 * no page-level merge is needed. Optional `onSaved` work uses it for other caches/navigation.
 * A custom provider must return its saved profile; the hook does not merge raw deltas.
 *
 * Adapt it to this app's profile:
 * - widen `AppUser` and `Fields` with the app's own columns, and map them in `toValues`;
 * - map ONLY changed fields in `toPatch` (an omitted field stays omitted — never turn it
 *   into `null` unless the API requires that), and normalize nullable text to `''` in `toValues`;
 * - the write route and method come from `authConfig.profileEndpoint` /
 *   `profileUpdateMethod` in `src/config.ts` — change the API wiring THERE, not here.
 *
 * A password change is not part of this page: the user resource serves it from its own
 * route, so put it in a security section with `useChangePassword`. Every string goes
 * through `t()` with an inline English fallback; every element a test drives carries
 * `data-mol-id`. Control ids come from Vue's useId(): the header drawer's account section is
 * mounted over this page and has its own name field.
 */
import type { UserProfile } from '@molecule/app-auth'

/** The app's profile shape: the shared base fields plus the columns this app serves. */
export interface AppUser extends UserProfile {
  username?: string
  bio?: string
}

/** Props for the settings page. */
export interface SettingsProps {
  /** App-specific post-save work; the form owns saving and publishing the user first. */
  onSaved?: (user: AppUser) => void | Promise<void>
}
</script>

<script setup lang="ts">
import { type ComponentPublicInstance, computed, useId } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useI18nError, useProfileForm, useTranslation } from '@molecule/app-vue'

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

const props = defineProps<SettingsProps>()

const cm = getClassMap()
const { t } = useTranslation()
const id = useId()
const profile = useProfileForm<AppUser, Fields>({
  defaultValues: EMPTY,
  toValues: (user) => ({
    name: user.name ?? '',
    username: user.username ?? '',
    bio: user.bio ?? '',
    avatar: user.avatar ?? '',
  }),
  toPatch: (changes) => changes,
  onSaved: props.onSaved,
})

// `profile.error` is `unknown`; the auth client rejects a save with an `I18nError` (the
// server's reason key), which this translates in the current locale.
const reason = useI18nError(() => {
  const failure = profile.error.value
  return failure instanceof Error ? failure : null
})

// The subscription snapshot makes the render reactive to every form state change
// (values, errors, submit flag), the way React's re-render re-runs `register`.
// The registration's element ref is an HTMLElement callback; a template ref hands
// Vue's wider contract (Element or component instance), so a native element passes
// through and anything else reads as no element.
const fields = computed(() => {
  void profile.formState.value
  const bind = (name: keyof Fields) => {
    const registration = profile.register(name)
    return {
      name: registration.name,
      value: registration.value,
      onChange: registration.onChange,
      onBlur: registration.onBlur,
      ref: (element: Element | ComponentPublicInstance | null): void => {
        registration.ref?.(element instanceof HTMLElement ? element : null)
      },
    }
  }
  return {
    name: bind('name'),
    username: bind('username'),
    bio: bind('bio'),
    avatar: bind('avatar'),
  }
})
</script>

<template>
  <section :class="cm.cn(cm.sp('py', 8), cm.sp('px', 4))">
    <h1 :class="cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))">
      {{ t('nav.settings', undefined, { defaultValue: 'Settings' }) }}
    </h1>
    <form v-bind="profile.formProps" :class="cm.stack(4)" data-mol-id="settings-form">
      <div>
        <label :for="`${id}-name`" :class="cm.formLabelSmall">
          {{ t('settings.name', undefined, { defaultValue: 'Name' }) }}
        </label>
        <input
          :id="`${id}-name`"
          v-bind="fields.name"
          :class="cm.input()"
          autocomplete="name"
          data-mol-id="settings-name"
        />
      </div>
      <div>
        <label :for="`${id}-username`" :class="cm.formLabelSmall">
          {{ t('auth.username', undefined, { defaultValue: 'Username' }) }}
        </label>
        <input
          :id="`${id}-username`"
          v-bind="fields.username"
          :class="cm.input()"
          autocomplete="username"
          data-mol-id="settings-username"
        />
      </div>
      <div>
        <label :for="`${id}-bio`" :class="cm.formLabelSmall">
          {{ t('form.bio', undefined, { defaultValue: 'Bio' }) }}
        </label>
        <textarea
          :id="`${id}-bio`"
          v-bind="fields.bio"
          rows="4"
          :class="cm.textarea()"
          data-mol-id="settings-bio"
        />
      </div>
      <div>
        <label :for="`${id}-avatar`" :class="cm.formLabelSmall">
          {{ t('ui.avatar.alt', undefined, { defaultValue: 'Avatar' }) }}
        </label>
        <input
          :id="`${id}-avatar`"
          v-bind="fields.avatar"
          :class="cm.input()"
          autocomplete="url"
          data-mol-id="settings-avatar"
        />
      </div>
      <div :class="cm.sp('mt', 2)">
        <button
          type="submit"
          :class="cm.button({ variant: 'solid' })"
          :disabled="!profile.ready.value || profile.isSubmitting.value"
          data-mol-id="settings-save"
        >
          {{
            profile.isSubmitting.value
              ? t('common.saving', undefined, { defaultValue: 'Saving...' })
              : t('common.saveChanges', undefined, { defaultValue: 'Save changes' })
          }}
        </button>
        <button
          type="button"
          :class="cm.cn(cm.button({ variant: 'ghost' }), cm.sp('ml', 2))"
          data-mol-id="settings-cancel"
          @click="profile.reset()"
        >
          {{ t('common.cancel', undefined, { defaultValue: 'Cancel' }) }}
        </button>
      </div>
      <p v-if="profile.error.value" role="alert" :class="cm.formError" data-mol-id="settings-error">
        {{
          t('common.couldNotSaveChanges', undefined, { defaultValue: 'Could not save changes.' })
        }}
        <template v-if="reason"> {{ reason }}</template>
      </p>
    </form>
  </section>
</template>
