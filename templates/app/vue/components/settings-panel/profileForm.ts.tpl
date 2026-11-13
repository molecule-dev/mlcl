/**
 * Profile editing over the app's bonded auth client.
 *
 * Vue port of `useProfileForm` from `@molecule/app-react` (the `@molecule/app-vue`
 * binding does not export it — its composables are the session, theme, i18n,
 * forms, push and device bindings). Same contract as the
 * React hook for what these templates use: the hook owns the whole
 * load → edit → submit → publish lifecycle, so pages never seed their controls
 * from an effect that erases typed edits when a background refresh lands; it
 * fills pristine fields when the signed-in user arrives, keeps dirty controls,
 * sends only the fields that changed, and publishes the saved user to every
 * `useAuth()` (the auth client's `updateProfile` already persists, stores,
 * publishes and returns the saved profile — this hook adds no merging).
 *
 * @module
 */
import { computed, type ComputedRef, reactive, type Ref, ref, watch } from 'vue'

import { useAuth, useAuthClient, useTranslation } from '@molecule/app-vue'

/** Per-field validation rules a consumer registers (a subset of the forms provider's). */
export interface ProfileFieldRules {
  /** Validates the field as an email, only when non-empty. */
  email?: boolean
}

/** Configuration for a profile form; transport stays in the auth bond. */
export interface UseProfileFormOptions<
  TUser extends object,
  TValues extends Record<string, string>,
> {
  /** Complete controlled-field defaults, including blank write-only fields. */
  defaultValues: TValues
  /** Maps the current/saved user into controlled values, e.g. nullable text to ''. */
  toValues: (user: TUser) => TValues
  /**
   * Maps ONLY changed fields into an API patch. Omit blank optional credentials
   * here; preserve undefined/absent fields rather than turning them into null.
   * The second argument is the complete value snapshot taken at submit time.
   */
  toPatch: (changes: Partial<TValues>, values: Readonly<TValues>) => Partial<TUser>
  /** Per-field validation rules, checked on change/blur and before a save. */
  validators?: Partial<Record<keyof TValues & string, ProfileFieldRules>>
  /**
   * Propagates the server's saved user to other caches, then navigates if needed.
   * Awaited before submission finishes. The auth client already persists and
   * publishes the saved user; never seed caches from the submitted patch.
   */
  onSaved?: (user: TUser) => void | Promise<void>
}

/** Controlled profile form state and bindings. */
export interface UseProfileFormResult<
  TUser extends object,
  TValues extends Record<string, string>,
> {
  /** The controlled values this form edits. */
  values: TValues
  /** A user has been loaded; disable submission until this is true. */
  ready: ComputedRef<boolean>
  /** True while a save (or its onSaved propagation) is in flight. */
  isSubmitting: Ref<boolean>
  /**
   * The latest save/propagation failure. Rejected saves retain edits; a failed
   * onSaved callback can be retried by submit without repeating the mutation.
   */
  error: Ref<unknown>
  /** Records an edit (marks the field dirty) and re-validates it. */
  edit: (name: keyof TValues & string, value: string) => void
  /** Re-validates a field after blur. */
  blur: (name: keyof TValues & string) => void
  /** The field's validation message, or undefined when valid. */
  getError: (name: keyof TValues & string) => string | undefined
  /**
   * Validates and saves one submit-time snapshot. Concurrent submits share the
   * same promise. Resolves the saved user, or undefined on validation,
   * save or propagation failure.
   */
  submit: () => Promise<TUser | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
}

/** The email shape the forms provider validates with (`email: true`). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Owns load → edit → submit → publish for the signed-in user's profile.
 *
 * Same-account background updates refresh untouched fields but preserve dirty
 * controls. Session ownership comes from the auth client's session revision.
 * Submission snapshots the registered values, validates, sends only changed
 * fields through `toPatch`, and uses the auth client's `updateProfile`
 * transport. The saved server response becomes the clean baseline; edits made
 * while saving remain dirty. No request is made for a patch with no fields.
 * A failed request retains the edits and shared user.
 *
 * @param options - Controlled defaults, wire adapters, validation rules, optional cache callback.
 * @returns Form state, control bindings, save error.
 */
export function useProfileForm<TUser extends object, TValues extends Record<string, string>>(
  options: UseProfileFormOptions<TUser, TValues>,
): UseProfileFormResult<TUser, TValues> {
  const client = useAuthClient<TUser>()
  const { user } = useAuth<TUser>()
  const { t } = useTranslation()

  const values = reactive({ ...options.defaultValues }) as TValues
  /**
   * Writes one controlled field. A generic object type indexed by a generic key
   * can only be READ (TS2862), so writes go through the string index signature
   * every `TValues` is constrained to.
   */
  const writeValue = (name: string, value: string): void => {
    ;(values as Record<string, string>)[name] = value
  }
  // The pristine baseline (last loaded/saved server values) edits are diffed against.
  const baseline = ref<Record<string, string>>({ ...options.defaultValues })
  // Fields the person edited — a late same-account record must not undo them,
  // even after those edits became the clean baseline of a completed save.
  const editedFields = new Set<string>()
  const errors = reactive<Record<string, string>>({})
  const error = ref<unknown>(undefined)
  const isSubmitting = ref(false)
  const ready = computed(() => user.value !== null)

  // Session ownership: a token from another account (or an unconfirmed session
  // revision) replaces the form; the same account only refreshes pristine fields.
  let ownerRevision: string | null = null

  const toValuesSnapshot = (current: TUser): Record<string, string> => ({
    ...options.toValues(current),
  })

  const validate = (name: keyof TValues & string): void => {
    delete errors[name]
    const rules = options.validators?.[name]
    if (!rules) return
    const value = values[name]
    // Email is validated only when non-empty; a blank field never blocks a save.
    if (rules.email && value.trim() && !EMAIL_PATTERN.test(value)) {
      errors[name] = t('forms.invalidEmail', undefined, { defaultValue: 'Invalid email address' })
    }
  }

  const edit = (name: keyof TValues & string, value: string): void => {
    editedFields.add(name)
    writeValue(name, value)
    validate(name)
  }

  const blur = (name: keyof TValues & string): void => {
    validate(name)
  }

  const getError = (name: keyof TValues & string): string | undefined => errors[name]

  const reset = (): void => {
    editedFields.clear()
    for (const key of Object.keys(errors)) delete errors[key]
    Object.assign(values, baseline.value)
    error.value = undefined
  }

  watch(
    () => user.value,
    (current, previous) => {
      if (!current) {
        if (previous !== null && ownerRevision !== null) {
          // Signed out: back to defaults, no stale edits or errors survive.
          ownerRevision = null
          editedFields.clear()
          for (const key of Object.keys(errors)) delete errors[key]
          Object.assign(values, { ...options.defaultValues })
          baseline.value = { ...options.defaultValues }
          error.value = undefined
        }
        return
      }
      const next = toValuesSnapshot(current)
      const revision = client.getSessionRevision?.()
      const revisionKey = revision === undefined ? null : String(revision)
      const sameAccount = revisionKey !== null && ownerRevision === revisionKey
      ownerRevision = revisionKey
      baseline.value = next
      if (!sameAccount) {
        editedFields.clear()
        for (const key of Object.keys(errors)) delete errors[key]
        Object.assign(values, next)
        error.value = undefined
        return
      }
      // Same-account background refresh: pristine fields take the loaded
      // values, dirty controls keep the person's edits.
      for (const key of Object.keys(values)) {
        if (!editedFields.has(key)) writeValue(key, next[key])
      }
    },
    { immediate: true },
  )

  let activeSave: Promise<TUser | undefined> | null = null

  const submit = (): Promise<TUser | undefined> => {
    if (activeSave) return activeSave
    const currentUser = client.getUser()
    if (!currentUser) return Promise.resolve(undefined)
    // Validate before reading credentials: an invalid field aborts the save
    // (the field error stays visible), like the React hook's form.handleSubmit.
    for (const name of Object.keys(options.validators ?? {}) as (keyof TValues & string)[]) {
      validate(name)
    }
    if (Object.keys(errors).length > 0) return Promise.resolve(undefined)

    const snapshot: Record<string, string> = { ...values }
    const before = { ...baseline.value }
    const changes: Record<string, string> = {}
    for (const key of Object.keys(snapshot)) {
      if (snapshot[key] !== before[key]) changes[key] = snapshot[key]
    }
    const patch = options.toPatch(changes as Partial<TValues>, snapshot as Readonly<TValues>)
    if (Object.keys(patch).length === 0) return Promise.resolve(undefined)

    error.value = undefined
    isSubmitting.value = true
    activeSave = (async (): Promise<TUser | undefined> => {
      try {
        const saved = await client.updateProfile(patch)
        const savedValues = toValuesSnapshot(saved)
        baseline.value = savedValues
        // The accepted response intentionally transformed or cleared a field
        // the person had edited and not re-edited during the save (for
        // example, a write-only password): take the server's value.
        for (const key of Object.keys(snapshot)) {
          if (values[key] === snapshot[key]) {
            if (savedValues[key] !== snapshot[key]) editedFields.delete(key)
            writeValue(key, savedValues[key])
          }
        }
        await options.onSaved?.(saved)
        return saved
      } catch (failure) {
        error.value = failure
        return undefined
      } finally {
        activeSave = null
        isSubmitting.value = false
      }
    })()
    return activeSave
  }

  return {
    values,
    ready,
    isSubmitting,
    error,
    edit,
    blur,
    getError,
    submit,
    reset,
  }
}
