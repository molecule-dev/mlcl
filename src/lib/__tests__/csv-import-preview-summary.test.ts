// @vitest-environment jsdom
/**
 * `ImportPage`'s preview summary told the user how many rows in their FILE were
 * valid: `{{totalRows}} rows found — {{valid}} valid, {{invalid}} with errors
 * (showing first 50)`. But `POST /api/import/preview` validates only the rows it
 * returns — `validateRows(rows.slice(0, 50))` in api/handlers/import.ts, while
 * `totalRows` is the whole file — so a 500-row CSV whose errors all sit after
 * row 50 was reported as "50 valid, 0 with errors": a clean-file verdict for a
 * file that will fail on commit. The summary now says which rows the counts
 * cover.
 *
 * Everything is the shipped component; only the ClassMap, i18n and the network
 * are stubbed.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  url: string
  answered: boolean
  respond: (status: number, body: unknown) => void
}

const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

const translate = vi.hoisted(
  () => (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
    (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
      String(values?.[name] ?? ''),
    ),
)

// `undefined` for every helper — the page passes some of them to react's `style`
// prop, which rejects a string.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: translate }),
}))

const { ImportPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/csv-import/app/pages/ImportPage')) as {
    ImportPage: (props: object) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

const text = (): string => container.textContent ?? ''

beforeEach(async () => {
  pending.requests.length = 0
  globalThis.fetch = ((input: unknown) =>
    new Promise((resolve) => {
      pending.requests.push({
        url: String(input),
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
      })
    })) as typeof globalThis.fetch
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(ImportPage, {}))
  })
  await flush()
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

describe('csv-import preview summary — the counts are scoped to the preview', () => {
  it('says which rows the valid/invalid counts cover', async () => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).not.toBeNull()
    const file = new File(['email,name\n'], 'many.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flush()

    expect(pending.requests[0]?.url).toBe('/api/import/preview')

    // The endpoint's answer for a 500-row file: `totalRows` is the whole file,
    // while `valid`/`invalid` describe the 50 rows it returned (and the errors
    // — rows 51+ — are not in this list at all).
    const previewRows = Array.from({ length: 50 }, (_, i) => ({
      email: `e${i}@example.test`,
      name: `row ${i}`,
    }))
    const request = pending.requests.find((r) => !r.answered)!
    request.answered = true
    await act(async () => {
      request.respond(200, { totalRows: 500, previewRows, valid: 50, invalid: [] })
    })
    await flush()

    expect(text()).toContain('500 rows found')
    expect(text()).toContain('first 50 checked')
  })
})

describe('csv-import commit — a partial failure says what the server kept', () => {
  /** Preview a file, then press the confirm button. */
  async function previewThenConfirm(): Promise<void> {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['email,name\ne@x.test,row\n'], 'ok.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await flush()

    const preview = pending.requests.find((r) => !r.answered)!
    preview.answered = true
    await act(async () => {
      preview.respond(200, {
        totalRows: 1,
        previewRows: [{ email: 'e@x.test', name: 'row' }],
        valid: 1,
        invalid: [],
      })
    })
    await flush()

    const confirm = container.querySelector('[data-mol-id="import-confirm"]')
    if (!confirm) throw new Error('the preview rendered no confirm button')
    await act(async () => {
      confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
  }

  it('surfaces the counts a mid-file failure answers with', async () => {
    await previewThenConfirm()

    const commit = pending.requests.find((r) => !r.answered)!
    commit.answered = true
    // The handler's partial-failure answer: the rows already stored, returned
    // with the comment "the counts ARE the message" (api/handlers/import.ts).
    await act(async () => {
      commit.respond(500, {
        error: 'The import stopped partway through — the rows already written were kept.',
        imported: 300,
        updated: 12,
        skipped: 4,
      })
    })
    await flush()

    expect(text()).toContain('stopped partway through')
    // Read only `error` before this: the reader was told rows were kept without
    // being told how many, and the answer the server computed was discarded.
    expect(text()).toContain('300 imported')
    expect(text()).toContain('12 updated')
    expect(text()).toContain('4 skipped')
  })
})
