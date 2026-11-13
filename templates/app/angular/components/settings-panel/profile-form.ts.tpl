/**
 * Profile editing over the app's bonded auth client.
 *
 * Angular port of `useProfileForm` from `@molecule/app-react` (the
 * `@molecule/app-angular` binding does not export it yet). Same contract for
 * what these templates use: the form owns the whole
 * load → edit → submit → publish lifecycle, so pages never seed their controls
 * from a subscription that erases typed edits when a background refresh lands;
 * it fills pristine fields when the signed-in user arrives, keeps dirty
 * controls, sends only the fields that changed, and publishes the saved user to
 * every session reader (the auth client's `updateProfile` already persists,
 * stores, publishes and returns the saved profile — this form merges nothing).
 *
 * @module
 */
import {
  computed,
  DestroyRef,
  inject,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core'

import { AUTH_CLIENT, MoleculeAuthService, t } from '@molecule/app-angular'
import type { AuthClient } from '@molecule/app-auth'

/** Per-field validation rules a consumer registers. */
export interface ProfileFieldRules {
  /** Validates the field as an email, only when non-empty. */
  email?: boolean
}

/** Configuration for a profile form; transport stays in the auth bond. */
export interface ProfileFormOptions<TUser extends object, TValues extends Record<string, string>> {
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
   * Propagates the server's saved user to other caches, then navigates if
   * needed. Awaited before submission finishes.
   */
  onSaved?: (user: TUser) => void | Promise<void>
}

/** Controlled profile form state and bindings. */
export interface ProfileForm<TUser extends object, TValues extends Record<string, string>> {
  /** The controlled values this form edits. */
  values: WritableSignal<TValues>
  /** A user has been loaded; disable submission until this is true. */
  ready: Signal<boolean>
  /** True while a save (or its onSaved propagation) is in flight. */
  isSubmitting: Signal<boolean>
  /** The latest save/propagation failure. Rejected saves retain edits. */
  error: WritableSignal<unknown>
  /** The field validation messages, keyed by field name. */
  errors: WritableSignal<Partial<Record<keyof TValues & string, string>>>
  /** Records an edit (marks the field dirty) and re-validates it. */
  edit: (name: keyof TValues & string, value: string) => void
  /** Re-validates a field after blur. */
  blur: (name: keyof TValues & string) => void
  /**
   * Validates and saves one submit-time snapshot. Resolves the saved user, or
   * undefined on validation, save or propagation failure.
   */
  submit: () => Promise<TUser | undefined>
  /** Discards edits and restores the newest loaded/saved profile baseline. */
  reset: () => void
}

/** The email shape the forms provider validates with (`email: true`). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Creates the profile form state over the injected auth client and session.
 *
 * Must be called in an injection context (a component field initializer or
 * constructor).
 *
 * @param options - Controlled defaults, wire adapters, validation rules, optional cache callback.
 * @returns The form state and control bindings.
 */
export function createProfileForm<TUser extends object, TValues extends Record<string, string>>(
  options: ProfileFormOptions<TUser, TValues>,
): ProfileForm<TUser, TValues> {
  const client = inject(AUTH_CLIENT) as AuthClient<TUser>
  const authService = inject(MoleculeAuthService) as MoleculeAuthService<TUser>
  const destroyRef = inject(DestroyRef)

  const values = signal<TValues>({ ...options.defaultValues })
  // The pristine baseline (last loaded/saved server values) edits are diffed against.
  const baseline = signal<Record<string, string>>({ ...options.defaultValues })
  // Fields the person edited — a late same-account record must not undo them,
  // even after those edits became the clean baseline of a completed save.
  const editedFields = new Set<string>()
  const errors = signal<Partial<Record<keyof TValues & string, string>>>({})
  const error = signal<unknown>(undefined)
  const isSubmitting = signal(false)
  const user = signal<TUser | null>(null)
  const ready = computed(() => user() !== null)

  // Session ownership: a token from another account (or an unconfirmed session
  // revision) replaces the form; the same account only refreshes pristine fields.
  let ownerRevision: string | null = null

  const snapshot = (current: TUser): Record<string, string> => ({ ...options.toValues(current) })

  const validate = (name: keyof TValues & string): void => {
    const next = { ...errors() }
    delete next[name]
    const rules = options.validators?.[name]
    if (rules?.email) {
      const value = values()[name]
      // Email is validated only when non-empty; a blank field never blocks a save.
      if (value.trim() && !EMAIL_PATTERN.test(value)) {
        next[name] = t('forms.invalidEmail', undefined, { defaultValue: 'Invalid email address' })
      }
    }
    errors.set(next)
  }

  const edit = (name: keyof TValues & string, value: string): void => {
    editedFields.add(name)
    values.update((current) => ({ ...current, [name]: value }) as TValues)
    validate(name)
  }

  const blur = (name: keyof TValues & string): void => {
    validate(name)
  }

  const reset = (): void => {
    editedFields.clear()
    errors.set({})
    values.set({ ...baseline() } as TValues)
    error.set(undefined)
  }

  const subscription = authService.user$.subscribe((current) => {
    user.set(current)
    if (!current) {
      if (ownerRevision !== null) {
        // Signed out: back to defaults, no stale edits or errors survive.
        ownerRevision = null
        editedFields.clear()
        errors.set({})
        values.set({ ...options.defaultValues })
        baseline.set({ ...options.defaultValues })
        error.set(undefined)
      }
      return
    }
    const next = snapshot(current)
    const revision = client.getSessionRevision?.()
    const revisionKey = revision === undefined ? null : String(revision)
    const sameAccount = revisionKey !== null && ownerRevision === revisionKey
    ownerRevision = revisionKey
    baseline.set(next)
    if (!sameAccount) {
      editedFields.clear()
      errors.set({})
      values.set(next as TValues)
      error.set(undefined)
      return
    }
    // Same-account background refresh: pristine fields take the loaded values,
    // dirty controls keep the person's edits.
    values.update((existing) => {
      const merged: Record<string, string> = { ...existing }
      for (const key of Object.keys(merged)) {
        if (!editedFields.has(key)) merged[key] = next[key]
      }
      return merged as TValues
    })
  })
  destroyRef.onDestroy(() => subscription.unsubscribe())

  let activeSave: Promise<TUser | undefined> | null = null

  const submit = (): Promise<TUser | undefined> => {
    if (activeSave) return activeSave
    const currentUser = client.getUser()
    if (!currentUser) return Promise.resolve(undefined)
    // Validate before reading credentials: an invalid field aborts the save
    // (the field error stays visible).
    for (const name of Object.keys(options.validators ?? {}) as (keyof TValues & string)[]) {
      validate(name)
    }
    if (Object.keys(errors()).length > 0) return Promise.resolve(undefined)

    const taken: Record<string, string> = { ...values() }
    const before = { ...baseline() }
    const changes: Record<string, string> = {}
    for (const key of Object.keys(taken)) {
      if (taken[key] !== before[key]) changes[key] = taken[key]
    }
    const patch = options.toPatch(changes as Partial<TValues>, taken as Readonly<TValues>)
    if (Object.keys(patch).length === 0) return Promise.resolve(undefined)

    error.set(undefined)
    isSubmitting.set(true)
    activeSave = (async (): Promise<TUser | undefined> => {
      try {
        const saved = await client.updateProfile(patch)
        const savedValues = snapshot(saved)
        baseline.set(savedValues)
        // The accepted response intentionally transformed or cleared a field the
        // person had edited and not re-edited during the save (for example, a
        // write-only password): take the server's value.
        values.update((existing) => {
          const merged: Record<string, string> = { ...existing }
          for (const key of Object.keys(taken)) {
            if (merged[key] === taken[key]) {
              if (savedValues[key] !== taken[key]) editedFields.delete(key)
              merged[key] = savedValues[key]
            }
          }
          return merged as TValues
        })
        await options.onSaved?.(saved)
        return saved
      } catch (failure) {
        error.set(failure)
        return undefined
      } finally {
        activeSave = null
        isSubmitting.set(false)
      }
    })()
    return activeSave
  }

  return { values, ready, isSubmitting, error, errors, edit, blur, submit, reset }
}
