import type { Accessor } from 'solid-js'
import { createEffect, createSignal, on, onCleanup } from 'solid-js'

import type {
  FieldRegistration,
  FormResetOptions,
  FormValuesConstraint,
  RegisterOptions,
} from '@molecule/app-forms'
import { formValuesEqual, getProvider, snapshotFormValue } from '@molecule/app-forms'
import { createAuth, createForm, getAuthClient } from '@molecule/app-solid'

/**
 * Profile editing over the app's bonded form and auth clients — the Solid
 * counterpart of `useProfileForm` in `@molecule/app-react`.
 *
 * Owns the whole load → edit → submit → publish lifecycle, so a page never
 * seeds its controls from a `createEffect([user])`: that effect is what erases
 * a typed bio or avatar when a background refresh lands, and the submit that
 * follows sends blanks. The primitive fills pristine fields when the signed-in
 * user arrives, keeps dirty controls, sends only the fields that changed, and
 * publishes the saved user to every `createAuth()` (the auth client's
 * `updateProfile` does that store/publish step).
 *
 * @module
 */

/**
 * Detaches the value snapshot the primitive keeps as its baseline.
 *
 * Form values are a plain string-keyed object at runtime; the caller's values
 * TYPE may be an `interface`, which has no index signature to spread from, so
 * the copy goes through the record view and comes back as `TValues`.
 *
 * @param values - The values object to snapshot.
 * @returns A detached form-value snapshot.
 */
function copyValues<T extends FormValuesConstraint<T>>(values: T): T {
  return snapshotFormValue(values as Record<string, unknown>) as T
}

/**
 * The record view of a values object, used inside the primitive to read and
 * write fields by name without asking the caller's `interface` for an index
 * signature it does not have.
 *
 * @param values - The values object to view as a string-keyed record.
 * @returns The same object, viewed as a record.
 */
function valueRecord<T extends FormValuesConstraint<T>>(values: T): Record<string, unknown> {
  return values as Record<string, unknown>
}

/** Field-registration options; the field name is supplied by the caller. */
type RegisterFieldOptions = Omit<RegisterOptions, 'name'> & { name?: string }

/** Configuration for a profile form; transport stays in the auth bond. */
export interface CreateProfileFormOptions<TUser, TValues extends FormValuesConstraint<TValues>> {
  /** Complete controlled-field defaults, including blank write-only fields. */
  defaultValues: TValues
  /** Externally loaded values, merged over `defaultValues` as the clean baseline. */
  values?: Partial<TValues>
  /** Controls how changed `values` are applied. */
  resetOptions?: FormResetOptions
  /**
   * Optional additional account identity check; changing it discards prior edits.
   * By default ownership follows the auth client's session revision, so editable
   * fields can change during a save. Providers without getSessionRevision must
   * supply this callback with an identity that remains stable across profile edits.
   */
  getIdentity?: (user: TUser) => string
  /** Maps the current/saved user into controlled values, e.g. nullable text to ''. */
  toValues: (user: TUser) => TValues
  /**
   * Maps ONLY changed fields into an API patch. Omit blank optional credentials
   * here; preserve undefined/absent fields rather than turning them into null.
   * The second argument is the complete value snapshot taken at submit time.
   */
  toPatch: (changes: Partial<TValues>, values: Readonly<TValues>) => Partial<TUser>
  /**
   * Propagates the server's saved user to other caches, then navigates if
   * needed. Awaited before submission finishes. The auth client already
   * persists and publishes the saved user; never seed caches from the
   * submitted patch.
   */
  onSaved?: (user: TUser) => void | Promise<void>
}

/** Controlled profile form state and native form bindings. */
export interface CreateProfileFormResult<TUser, TValues extends FormValuesConstraint<TValues>> {
  /** The shared auth user's current profile. */
  user: Accessor<TUser | null>
  /** A user has been loaded; disable submission until this is true. */
  ready: Accessor<boolean>
  /**
   * The latest save/propagation failure. Rejected saves retain edits; a failed
   * onSaved callback can be retried by submit without repeating the mutation.
   */
  error: Accessor<unknown>
  /** Whether a save is in flight (submission state of the whole form). */
  isSubmitting: Accessor<boolean>
  /** Whether every field passes validation. */
  isValid: Accessor<boolean>
  /** Whether any field differs from the baseline. */
  isDirty: Accessor<boolean>
  /** The current field errors. */
  errors: Accessor<Partial<Record<keyof TValues, string>>>
  /**
   * The field's validation error message, when the field's schema rejects its
   * current value (e.g. `register('email', { email: true })`).
   */
  getError: <K extends keyof TValues & string>(name: K) => string | undefined
  /**
   * Native input/textarea bindings with the field's concrete value type.
   * Spreads onto `<input>` / `<textarea>`; the `value` getter stays reactive.
   */
  register: <K extends keyof TValues & string>(
    name: K,
    options?: RegisterFieldOptions,
  ) => Omit<FieldRegistration, 'value'> & {
    value: TValues[K]
    /** Solid's `onInput` handler; React's `onChange` fires per keystroke. */
    onInput: (event: Parameters<FieldRegistration['onChange']>[0]) => void
  }
  /** Writes one field's value (and marks it edited). */
  setValue: <K extends keyof TValues & string>(name: K, value: TValues[K]) => void
  /** Bind to the native form, with a type="submit" button inside it. */
  formProps: { onSubmit: (event: Event) => void }
  /**
   * Validates and saves one submit-time snapshot. Concurrent submits share the
   * same promise. Resolves undefined on validation, save or propagation failure.
   */
  submit: () => Promise<TUser | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
}

/**
 * Owns load → edit → submit → publish for the signed-in user's profile.
 *
 * Same-account background updates refresh untouched fields but preserve dirty
 * controls. Session ownership comes from the auth client's session revision,
 * independently of mutable profile fields; an explicit getIdentity adds the
 * caller's identity check. Submission snapshots the registered values before
 * asynchronous validation, sends only changed fields through `toPatch`, and
 * uses the auth client's configured updateProfile transport. The saved server
 * response becomes the clean baseline; edits made while saving remain dirty.
 * No request is made for a patch with no fields. A failed request retains the
 * edits and shared user.
 *
 * @param options - Controlled defaults, identity and wire adapters, optional cache/navigation callback.
 * @returns Form state, typed control bindings, native submit binding and save error.
 */
export function createProfileForm<
  TUser extends object,
  TValues extends FormValuesConstraint<TValues>,
>(options: CreateProfileFormOptions<TUser, TValues>): CreateProfileFormResult<TUser, TValues> {
  const client = getAuthClient<TUser>()
  const { user } = createAuth<TUser>()
  const form = createForm<TValues>(getProvider(), {
    defaultValues: options.defaultValues,
    values: options.values,
    resetOptions: options.resetOptions,
  })
  const [error, setError] = createSignal<unknown>(undefined)
  const [isSaving, setIsSaving] = createSignal(false)

  // The clean baseline (the loaded/saved profile), kept detached from the form.
  let baseline: TValues = copyValues(options.defaultValues)
  // A late same-account record must not undo fields the person edited, even
  // after those edits became the clean baseline of a completed save.
  const editedFields = new Set<string>()
  // Session ownership marker: the auth client's session revision at the time
  // the current profile was loaded; `null` means no owned session.
  let owner: {
    client: typeof client
    revision: number | undefined
    identity: string | undefined
  } | null = null
  let activeSave: Promise<TUser | undefined> | null = null
  let pendingPropagation: TUser | undefined
  let mounted = true

  onCleanup(() => {
    mounted = false
  })

  const readValues = (): TValues => {
    const values = copyValues(baseline)
    const record = valueRecord(values)
    for (const key of Object.keys(record)) {
      record[key] = form.controller.getValue(key)
    }
    return values
  }

  /**
   * Makes `next` the clean baseline. Without `preserveAgainst` the controls
   * take the new values wholesale (and stop being dirty); with it, fields the
   * person edited — or changed since the submission snapshot — keep their
   * current value.
   */
  const rebase = (next: TValues, preserveAgainst?: Readonly<TValues>): void => {
    const current = readValues()
    baseline = copyValues(next)
    if (preserveAgainst) {
      form.updateValues(next, { keepDirtyValues: true })
      const currentRecord = valueRecord(current)
      const preserved = valueRecord(preserveAgainst as TValues)
      for (const key of Object.keys(currentRecord)) {
        if (editedFields.has(key) || !formValuesEqual(currentRecord[key], preserved[key])) {
          form.controller.setValue(key, currentRecord[key])
        }
      }
    } else {
      editedFields.clear()
      form.reset(next)
    }
  }

  // Fill pristine fields when the signed-in user arrives; keep dirty controls
  // on a same-account background refresh; reset everything when the session ends.
  createEffect(
    on(
      user,
      (current) => {
        if (!current) {
          if (owner) {
            owner = null
            pendingPropagation = undefined
            editedFields.clear()
            rebase(copyValues(options.defaultValues))
            setError(undefined)
          }
          return
        }
        const revision = client.getSessionRevision?.()
        const identity = options.getIdentity?.(current)
        if (revision === undefined && !options.getIdentity) {
          throw new Error(
            'createProfileForm: provide getIdentity when the auth client has no session revision',
          )
        }
        const previous = owner
        const sameAccount =
          !previous ||
          (previous.client === client &&
            previous.revision === revision &&
            previous.identity === identity)
        const previousBaseline = baseline
        // Keep this token across same-account hydration, but replace it when
        // the account/client changes. A pending validation belongs to that
        // exact owner.
        if (!previous || !sameAccount) {
          owner = { client, revision, identity }
          editedFields.clear()
        }
        rebase(options.toValues(current), sameAccount ? previousBaseline : undefined)
        if (!sameAccount) {
          pendingPropagation = undefined
          setError(undefined)
        }
      },
      { defer: false },
    ),
  )

  const submit = (): Promise<TUser | undefined> => {
    if (activeSave) return activeSave
    const currentUser = client.getUser()
    if (!mounted || !currentUser) return Promise.resolve(undefined)
    const revision = client.getSessionRevision?.()
    const identity = options.getIdentity?.(currentUser)
    const submissionOwner = owner
    const ownsProfile = (): boolean => {
      const now = client.getUser()
      return (
        mounted &&
        owner === submissionOwner &&
        now !== null &&
        client.getSessionRevision?.() === revision &&
        options.getIdentity?.(now) === identity
      )
    }
    const snapshot = readValues()
    const before = copyValues(baseline)
    const changes: Partial<TValues> = {}
    const snapshotRecord = valueRecord(snapshot)
    const beforeRecord = valueRecord(before)
    for (const key of Object.keys(snapshotRecord)) {
      if (!formValuesEqual(snapshotRecord[key], beforeRecord[key])) {
        ;(changes as Record<string, unknown>)[key] = snapshotRecord[key]
      }
    }
    setError(undefined)
    setIsSaving(true)
    let saved: TUser | undefined
    const run = async (): Promise<TUser | undefined> => {
      try {
        await form.handleSubmit(async () => {
          // Validation can await arbitrary app work. Check BEFORE toPatch and
          // again immediately before the mutation: its credentials are read by
          // updateProfile now, not when the reader originally clicked Save.
          if (!ownsProfile()) return
          const patch = options.toPatch(changes, snapshot)
          if (Object.keys(patch).length > 0) {
            if (!ownsProfile()) return
            const updated = await client.updateProfile(patch)
            saved = updated
            if (!ownsProfile()) {
              saved = undefined
              return
            }
            if (mounted) {
              const savedValues = options.toValues(updated)
              const current = readValues()
              const currentRecord = valueRecord(current)
              const savedRecord = valueRecord(savedValues)
              for (const key of editedFields) {
                if (
                  formValuesEqual(currentRecord[key], snapshotRecord[key]) &&
                  !formValuesEqual(savedRecord[key], snapshotRecord[key])
                ) {
                  // The accepted response intentionally transformed or cleared
                  // this field (for example, a write-only password).
                  editedFields.delete(key)
                  form.controller.setValue(key, savedRecord[key])
                }
              }
              rebase(savedValues, snapshot)
            }
            pendingPropagation = saved
          }
          if (pendingPropagation !== undefined) {
            if (!ownsProfile()) {
              saved = undefined
              return
            }
            const propagated = pendingPropagation
            await options.onSaved?.(propagated)
            pendingPropagation = undefined
            saved = propagated
          }
        })()
        return saved
      } catch (failure) {
        if (mounted) setError(failure)
        return undefined
      } finally {
        activeSave = null
        if (mounted) setIsSaving(false)
      }
    }
    activeSave = run()
    return activeSave
  }

  const register = <K extends keyof TValues & string>(
    name: K,
    registerOptions?: RegisterFieldOptions,
  ): Omit<FieldRegistration, 'value'> & {
    value: TValues[K]
    onInput: (event: Parameters<FieldRegistration['onChange']>[0]) => void
  } => {
    const registration = form.controller.register({ ...registerOptions, name })
    const handleChange = (event: Parameters<FieldRegistration['onChange']>[0]): void => {
      editedFields.add(name)
      registration.onChange(event)
    }
    return {
      name: registration.name,
      // A getter so the JSX spread stays reactive (a snapshot value would
      // freeze at the first render).
      get value(): TValues[K] {
        // Reads the form-state SIGNAL (not the controller's raw value) so the
        // getter is reactive when a JSX spread re-evaluates it.
        return (form.formState().values as Record<string, unknown>)[name] as TValues[K]
      },
      onChange: handleChange,
      // React's onChange fires per keystroke; the DOM's native `change` fires
      // only on commit, so the same handler also rides `input`.
      onInput: handleChange,
      onBlur: registration.onBlur,
      ref: registration.ref,
    }
  }

  const setValue = <K extends keyof TValues & string>(name: K, value: TValues[K]): void => {
    editedFields.add(name)
    form.controller.setValue(name, value)
  }

  return {
    user,
    ready: () => user() !== null,
    error,
    isSubmitting: () => isSaving() || form.isSubmitting(),
    isValid: form.isValid,
    isDirty: form.isDirty,
    errors: form.errors,
    getError: (name) => form.errors()[name as keyof TValues],
    register,
    setValue,
    formProps: {
      onSubmit: (event: Event) => {
        event.preventDefault()
        void submit()
      },
    },
    submit,
    reset: () => {
      editedFields.clear()
      form.reset(baseline)
      setError(undefined)
    },
  }
}
