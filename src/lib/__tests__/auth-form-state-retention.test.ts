// @vitest-environment jsdom
import { act, createElement, type FunctionComponent, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { createMemoryStorageProvider, type StorageProvider } from '@molecule/app-storage'

/**
 * UI-anchored proof of the cross-view auth-form persistence policy every
 * wired template now depends on (TPL1):
 *
 *   - SHARED non-secret fields (`email` and the name-family field, here
 *     `name`) survive navigating from one auth view to another and are
 *     cleared on successful auth.
 *   - SECRETS (`password`) are DELIBERATELY NOT persisted across views: a
 *     password typed on one view does not reappear on the next. This is the
 *     documented security decision (credential hygiene + current-vs-new
 *     password semantics) — see scripts/verify-auth-form-state.mjs.
 *
 * This renders REAL `useAuthFormState` into REAL DOM (jsdom), binding the
 * inputs exactly the way the template auth pages now do — `value={fields.X}`
 * / `onChange={setField('X', …)}` for shared fields, and a LOCAL `useState`
 * for the password (mirroring Login.tsx/Signup.tsx). It then fully unmounts
 * one view and mounts another sharing the same StorageProvider — the SPA
 * route swap the audit found broken.
 */

// react-dom act() requires this flag outside the React test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * A minimal auth view mirroring template pages: `email` + `name` are bound to
 * the shared hook (cross-view), while `password` is LOCAL component state.
 *
 * @param storage - The shared StorageProvider backing cross-view persistence.
 * @param onSubmit - Optional submit handler, receives the hook's `clear`.
 * @returns A React component.
 */
function makeView(
  storage: StorageProvider,
  onSubmit?: (clear: () => void) => void,
): FunctionComponent {
  return function AuthView() {
    const { fields, setField, clear } = useAuthFormState({ storage })
    // Secret: deliberately LOCAL state, never the shared store (TPL1 policy).
    const [password, setPassword] = useState('')
    return createElement(
      'form',
      {
        onSubmit: (e: { preventDefault: () => void }) => {
          e.preventDefault()
          onSubmit?.(clear)
        },
      },
      createElement('input', {
        'aria-label': 'email',
        type: 'email',
        value: fields.email ?? '',
        onChange: (e: { target: { value: string } }) => setField('email', e.target.value),
      }),
      createElement('input', {
        'aria-label': 'name',
        type: 'text',
        value: fields.name ?? '',
        onChange: (e: { target: { value: string } }) => setField('name', e.target.value),
      }),
      createElement('input', {
        'aria-label': 'password',
        type: 'password',
        value: password,
        onChange: (e: { target: { value: string } }) => setPassword(e.target.value),
      }),
      createElement('button', { type: 'submit' }, 'submit'),
    )
  }
}

let container: HTMLElement
let root: Root

const mount = async (view: FunctionComponent): Promise<void> => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(view))
  })
  // Flush the async hydrate-from-storage effect.
  await act(async () => {
    await new Promise((r) => setTimeout(r))
  })
}

const unmount = async (): Promise<void> => {
  await act(async () => {
    root.unmount()
  })
  container.remove()
}

const inputFor = (label: string): HTMLInputElement =>
  container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement

/** Type into a labelled input the way a real user does (native input event). */
const typeInto = async (label: string, value: string): Promise<void> => {
  const input = inputFor(label)
  const setNativeValue = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  await act(async () => {
    setNativeValue?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r))
  })
}

const valueOf = (label: string): string => inputFor(label).value

afterEach(async () => {
  if (root && document.body.contains(container)) await unmount()
})

describe('TPL1 — useAuthFormState retains shared fields across auth views', () => {
  let storage: StorageProvider

  beforeEach(() => {
    storage = createMemoryStorageProvider()
  })

  it('carries the email typed on one view to a different view after a full unmount/remount', async () => {
    // View 1 (e.g. Login): user types their email.
    await mount(makeView(storage))
    expect(valueOf('email')).toBe('')
    await typeInto('email', 'ada@calc.dev')
    expect(valueOf('email')).toBe('ada@calc.dev')

    // SPA route change: View 1 unmounts entirely.
    await unmount()

    // View 2 (e.g. Signup) mounts — must hydrate the shared email from storage.
    await mount(makeView(storage))
    expect(valueOf('email')).toBe('ada@calc.dev')
  })

  it('carries a non-email shared field (name) across views — "any other shared fields"', async () => {
    // The verbatim asked for "email AND any other shared fields"; the gap was
    // that ONLY email was shared. A name typed on Signup must survive a
    // Signup -> Login -> Signup swap exactly like the email does.
    await mount(makeView(storage))
    await typeInto('name', 'Ada Lovelace')
    expect(valueOf('name')).toBe('Ada Lovelace')

    await unmount()

    await mount(makeView(storage))
    expect(valueOf('name')).toBe('Ada Lovelace')
  })

  it('does NOT persist password across views (deliberate security exclusion)', async () => {
    // Secrets are intentionally LOCAL state, never the shared store, so a
    // password typed on one view must NOT leak into the next (credential
    // hygiene + current-vs-new-password semantics). See the gate header.
    await mount(makeView(storage))
    await typeInto('email', 'ada@calc.dev')
    await typeInto('password', 'hunter2-secret')
    expect(valueOf('password')).toBe('hunter2-secret')

    // SPA route swap.
    await unmount()
    await mount(makeView(storage))

    // Shared field survives; the secret does NOT.
    expect(valueOf('email')).toBe('ada@calc.dev')
    expect(valueOf('password')).toBe('')
    // And nothing password-shaped was written to the shared store.
    const stored = (await storage.get('molecule.auth.form-state')) as Record<string, unknown> | null
    expect(stored?.password).toBeUndefined()
  })

  it('clears the shared fields on successful auth', async () => {
    // The success handler clears the shared state, mirroring the template
    // pages (`await login(...); clearAuthForm()`).
    let clearCalled = false
    await mount(
      makeView(storage, (clear) => {
        clearCalled = true
        clear()
      }),
    )
    await typeInto('email', 'ada@calc.dev')
    await typeInto('name', 'Ada Lovelace')
    expect(valueOf('email')).toBe('ada@calc.dev')

    // Submit -> success handler calls clear() (what template handlers now do).
    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r))
    })
    expect(clearCalled).toBe(true)
    expect(valueOf('email')).toBe('')
    expect(valueOf('name')).toBe('')

    // And a freshly-mounted view no longer rehydrates the cleared fields.
    await unmount()
    await mount(makeView(storage))
    expect(valueOf('email')).toBe('')
    expect(valueOf('name')).toBe('')
  })
})
