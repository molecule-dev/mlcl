// @vitest-environment jsdom
/**
 * `CouponField` applies a promo code through `POST /api/coupons/validate`,
 * whose VERDICT on a code is a 4xx carrying `{ valid: false, reason }`
 * (coupons.ts answers 400 / 404 / 409 / 410 that way).
 *
 * Every other outcome — a rejected fetch, a 5xx, a 2xx body that is not the
 * endpoint's answer — means the code was NOT judged. The component reported all
 * of them as "Invalid code" AND called `onApply(null)`, so a network blip while
 * re-applying the code already in force told the reader their code was bad and
 * threw away the discount the parent was holding: a failure the reader pays for
 * in state, reported as their own mistake.
 *
 * The REAL component is rendered into REAL DOM (jsdom) — only the ClassMap /
 * i18n bonds and the network are stubbed.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  answered: boolean
  respond: (status: number, body: unknown) => void
  /** Reject the request the way a failed network does. */
  fail: (error: Error) => void
}

const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...parts: unknown[]) => parts.filter(Boolean).join(' '),
    flex: () => 'stub',
    flex1: 'stub',
    input: () => 'stub',
    button: () => 'stub',
    textSize: () => 'stub',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
}))

const { CouponField } =
  (await import('../../../templates/.agents/skills/examples/commerce/promo-codes/app/components/CouponField')) as {
    CouponField: (props: { onApply: (code: string | null) => void }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root
/** Every code the component handed upward, in order. */
let applied: Array<string | null>

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(): Promise<void> {
  applied = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(CouponField, { onApply: (code) => applied.push(code) }))
  })
  await flush()
}

/** Type a code and press Apply, leaving the request pending. */
async function applyCode(code: string): Promise<Pending> {
  const input = container.querySelector('input') as HTMLInputElement | null
  if (!input) throw new Error('the component rendered no input')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, code)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
  const button = container.querySelector('button') as HTMLButtonElement | null
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
  const request = pending.requests.at(-1)
  if (!request) throw new Error('no request was sent')
  return request
}

async function answer(request: Pending, status: number, body: unknown): Promise<void> {
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

const text = (): string => container.textContent ?? ''

beforeEach(() => {
  pending.requests.length = 0
  globalThis.fetch = (() =>
    new Promise((resolve, reject) => {
      pending.requests.push({
        answered: false,
        respond: (status, body) =>
          resolve({ ok: status >= 200 && status < 300, status, json: async () => body }),
        fail: reject,
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('CouponField — only the endpoint’s verdict is a verdict on the code', () => {
  it('applies a code the endpoint confirmed', async () => {
    await mount()
    const request = await applyCode('SAVE10')
    await answer(request, 200, { valid: true, percent_off: 10 })

    expect(text()).toContain('SAVE10 applied — 10% off')
    expect(applied).toEqual(['SAVE10'])
  })

  it('reports the endpoint’s own reason and clears the coupon when it rejects the code', async () => {
    // The verdict shape: a 4xx carrying `{ valid: false, reason }`. It IS a
    // judgement about the code, so the parent must stop holding the old one.
    await mount()
    const request = await applyCode('EXPIRED')
    await answer(request, 410, { valid: false, reason: 'Code expired' })

    expect(text()).toContain('Code expired')
    expect(applied).toEqual([null])
  })

  it('does not blame the code — or drop the applied coupon — when the request fails', async () => {
    // A rejected fetch never reached a verdict. Reporting "Invalid code" and
    // calling onApply(null) told the reader their code was bad and cleared the
    // discount the parent already had in force, over a network blip.
    await mount()
    const request = await applyCode('SAVE10')
    await act(async () => {
      request.fail(new Error('network down'))
    })
    await flush()

    expect(text()).toContain('Could not check that code')
    expect(text()).not.toContain('Invalid code')
    expect(applied).toEqual([])
  })

  it('treats a 5xx with no verdict the same as a failed request', async () => {
    // A server error carries no `valid: false`, so it is not the endpoint saying
    // the code is bad — the reader keeps what they had.
    await mount()
    const request = await applyCode('SAVE10')
    await answer(request, 500, { error: 'boom' })

    expect(text()).toContain('Could not check that code')
    expect(text()).not.toContain('Invalid code')
    expect(applied).toEqual([])
  })

  it('treats a 2xx body that is not the endpoint’s answer the same way', async () => {
    // A 200 `{}` (an unmocked route, a rewritten answer) says nothing about the
    // code; `!body.valid` read it as a rejection.
    await mount()
    const request = await applyCode('SAVE10')
    await answer(request, 200, {})

    expect(text()).toContain('Could not check that code')
    expect(applied).toEqual([])
  })

  it('releases the Apply button after every non-verdict failure — a retry must be possible', async () => {
    // `finally { setBusy(false) }` is what makes the retry the failure messages
    // ask for possible at all, and nothing re-read the button after a failure:
    // a `setBusy(false)` moved onto the success/verdict branches (or the
    // `finally` dropped) left the reader with an Apply button disabled forever
    // over the code the message tells them to try again — with the input text
    // kept on purpose, so a reload was the only way out. All three non-verdict
    // shapes go through it.
    const applyButton = (): HTMLButtonElement =>
      container.querySelector('button') as HTMLButtonElement
    const expectRetryable = (after: string): void => {
      expect(applyButton().disabled, `after ${after} the Apply button must be usable again`).toBe(
        false,
      )
      expect(text(), `after ${after} the label must not stay on “Applying…”`).not.toContain(
        'Applying…',
      )
    }
    await mount()

    const rejected = await applyCode('SAVE10')
    await act(async () => {
      rejected.fail(new Error('offline'))
    })
    await flush()
    expectRetryable('a rejected fetch')

    const serverError = await applyCode('SAVE10')
    await answer(serverError, 500, { error: 'boom' })
    expectRetryable('a 5xx')

    const nonAnswer = await applyCode('SAVE10')
    await answer(nonAnswer, 200, {})
    expectRetryable('a 2xx that is not the endpoint’s answer')
  })
})
