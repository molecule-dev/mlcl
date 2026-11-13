/**
 * Profile editing over the app's bonded form provider and auth client —
 * the store counterpart of the React scaffold's `useProfileForm`.
 *
 * Owns load → edit → submit → publish for the signed-in user's profile:
 * fills pristine fields when the signed-in user arrives (call `hydrate`
 * reactively from the component), keeps dirty controls across a same-account
 * background refresh, sends only the fields that changed, and lets the auth
 * client persist and publish the saved user. A failed save retains the edits
 * and the error for display.
 */
import { derived, get, type Readable, writable } from 'svelte/store'

import type { AuthClient } from '@molecule/app-auth'
import {
  type FieldRegistration,
  type FormValuesConstraint,
  formValuesEqual,
  nativeProvider,
  type RegisterOptions,
} from '@molecule/app-forms'
import { createFormStores } from '@molecule/app-svelte'

/** Configuration for a profile form; transport stays in the auth bond. */
export interface ProfileFormOptions<TUser, TValues extends FormValuesConstraint<TValues>> {
  /** Complete controlled-field defaults, including blank write-only fields. */
  defaultValues: TValues
  /** Maps the current/saved user into controlled values, e.g. nullable text to ''. */
  toValues: (user: TUser) => TValues
  /**
   * Maps ONLY changed fields into an API patch. Omit blank optional
   * credentials here; preserve absent fields rather than turning them into
   * null. The second argument is the complete value snapshot at submit time.
   */
  toPatch: (changes: Partial<TValues>, values: Readonly<TValues>) => Partial<TUser>
}

/** Controlled profile form state and native form bindings. */
export interface ProfileFormStores<TValues extends FormValuesConstraint<TValues>> {
  /**
   * Whole-form state (values, validation errors, isSubmitting). Read it
   * reactively (`$formState`) in the component template.
   */
  formState: Readable<{
    values: TValues
    errors: Partial<Record<keyof TValues, string>>
    isSubmitting: boolean
  }>
  /** The current validation error message for one field. */
  getError: <K extends keyof TValues>(name: K) => string | undefined
  /**
   * Field bindings; call reactively (inside `$derived`) so the returned
   * registration always carries the live field value.
   */
  register: (
    name: keyof TValues,
    registerOptions?: Omit<RegisterOptions, 'name'>,
  ) => FieldRegistration
  /**
   * Fills pristine fields from a signed-in user (or resets to the defaults
   * when null). Call reactively from a component effect so a same-account
   * background refresh keeps dirty controls.
   */
  hydrate: (user: unknown) => void
  /** Validates and saves one submit-time snapshot; resolves undefined on failure. */
  submit: () => Promise<unknown | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
  /** The latest save failure; rejected saves retain edits. */
  error: Readable<unknown>
  /** A user has been loaded; disable submission until this is true. */
  ready: Readable<boolean>
  /** Native submit binding for the `<form>` element. */
  formProps: { onsubmit: (event: SubmitEvent) => void }
}

/**
 * A detached shallow copy of a values object.
 *
 * `Object.assign` (unlike a spread) accepts the generic `TValues` type, whose
 * `FormValuesConstraint` resolves to a conditional type TypeScript will not
 * treat as an object type. The result is the same plain copy the React
 * scaffold's `useProfileForm` keeps as its baseline.
 *
 * @param values - The values object to copy.
 * @returns A detached copy.
 */
function cloneValues<T>(values: T): T {
  return Object.assign({}, values)
}

/**
 * Creates the profile-form stores for one mounted component.
 *
 * @param client - The app's bonded auth client (owns the `updateProfile` transport).
 * @param options - Controlled defaults and wire adapters.
 * @returns Form state, control bindings, hydrate/submit/reset actions and save error.
 */
export function createProfileFormStores<TUser, TValues extends FormValuesConstraint<TValues>>(
  client: AuthClient<TUser>,
  options: ProfileFormOptions<TUser, TValues>,
): ProfileFormStores<TValues> {
  const form = createFormStores<TValues>(nativeProvider, {
    defaultValues: cloneValues(options.defaultValues),
  })

  // Detached snapshot of the last loaded/saved profile — the baseline the
  // submit diff runs against.
  let baseline: TValues = cloneValues(options.defaultValues)
  // Fields the person edited. A late same-account record must not undo them,
  // even after those edits became the clean baseline of a completed save.
  const editedFields = new Set<keyof TValues>()
  // Session ownership (the auth client's session revision): an older account
  // read must not publish over a save or a different session.
  let owner: { revision: number | undefined } | null = null

  const saving = writable(false)
  const saveError = writable<unknown>(undefined)
  // A user has been loaded; callers disable submission until this is true.
  const readyState = writable(false)

  function readValues(): TValues {
    const snapshot = cloneValues(baseline)
    for (const key of Object.keys(snapshot) as (keyof TValues)[]) {
      snapshot[key] = form.controller.getValue(key) as TValues[keyof TValues]
    }
    return snapshot
  }

  function rebase(next: TValues, preserveAgainst?: Readonly<TValues>): void {
    const current = readValues()
    baseline = cloneValues(next)
    if (preserveAgainst) {
      form.updateValues(next, { keepDirtyValues: true })
      for (const key of Object.keys(current) as (keyof TValues)[]) {
        if (editedFields.has(key) || !formValuesEqual(current[key], preserveAgainst[key])) {
          form.setValue(key, current[key])
        }
      }
    } else {
      form.reset(next)
    }
  }

  /**
   * Hydrate when the signed-in user arrives; same-account background updates
   * refresh untouched fields but preserve dirty controls. A null user (no
   * session) resets to the defaults.
   */
  function hydrate(current: TUser | null): void {
    readyState.set(current !== null)
    if (!current) {
      if (owner) {
        owner = null
        editedFields.clear()
        rebase(cloneValues(options.defaultValues))
        saveError.set(undefined)
      }
      return
    }
    const revision = client.getSessionRevision?.()
    if (revision === undefined) {
      throw new Error('createProfileFormStores: the auth client must expose getSessionRevision()')
    }
    const previous = owner
    const sameAccount = !previous || previous.revision === revision
    const previousBaseline = baseline
    if (!previous || !sameAccount) {
      owner = { revision }
      editedFields.clear()
    }
    rebase(options.toValues(current), sameAccount ? previousBaseline : undefined)
    if (!sameAccount) {
      saveError.set(undefined)
    }
  }

  async function submit(): Promise<TUser | undefined> {
    const currentUser = client.getUser()
    if (!currentUser) return undefined
    const snapshot = readValues()
    const before = cloneValues(baseline)
    const changes: Partial<TValues> = {}
    for (const key of Object.keys(snapshot) as (keyof TValues)[]) {
      if (!formValuesEqual(snapshot[key], before[key])) changes[key] = snapshot[key]
    }
    saveError.set(undefined)
    saving.set(true)
    try {
      const patch = options.toPatch(changes, snapshot)
      if (Object.keys(patch).length === 0) return undefined
      // The client persists and publishes the saved user; the accepted
      // response becomes the new clean baseline. Edits made while saving
      // stay dirty.
      const saved = await client.updateProfile(patch)
      rebase(options.toValues(saved), snapshot)
      return saved
    } catch (failure) {
      saveError.set(failure)
      return undefined
    } finally {
      saving.set(false)
    }
  }

  function reset(): void {
    editedFields.clear()
    form.reset(baseline)
    saveError.set(undefined)
  }

  const isSubmitting = derived(
    [form.isSubmitting, saving],
    ([formBusy, saveBusy]) => formBusy || saveBusy,
  )

  const formState = derived([form.formState, isSubmitting], ([state, busy]) => ({
    values: state.values,
    errors: state.errors,
    isSubmitting: busy,
  }))

  function register(
    name: keyof TValues,
    registerOptions?: Omit<RegisterOptions, 'name'>,
  ): FieldRegistration {
    const registration = form.register(
      name as string,
      registerOptions ? { ...registerOptions, name: name as string } : undefined,
    )
    return {
      ...registration,
      onChange: (event: unknown) => {
        editedFields.add(name)
        registration.onChange(event)
      },
    }
  }

  function handleFormSubmit(event: SubmitEvent): void {
    event.preventDefault()
    void submit()
  }

  return {
    formState,
    getError: <K extends keyof TValues>(name: K) => get(form.errors)[name],
    register,
    hydrate: hydrate as (user: unknown) => void,
    submit: submit as () => Promise<unknown | undefined>,
    reset,
    error: saveError,
    ready: readyState,
    formProps: { onsubmit: handleFormSubmit },
  }
}
