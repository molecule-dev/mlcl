// @vitest-environment jsdom
/**
 * `ExportButton` must build ONE well-formed query, whatever the endpoint it is
 * handed.
 *
 * The href was `${endpoint}?${qs}`, so an endpoint that already carries a query
 * (`/api/orders/export?format=csv`) produced `…?format=csv?status=open` — the
 * second `?` is not a separator there, it became part of `format`'s value, and
 * the download hit a different query than the caller asked for. The separator is
 * now chosen from the endpoint.
 *
 * @module
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}))

const { ExportButton } =
  (await import('../../../templates/.agents/skills/examples/data-display/csv-export/app/components/ExportButton.js')) as {
    ExportButton: (props: {
      endpoint: string
      filterParams?: Record<string, string | undefined>
    }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

/** Render the button and return the href it points the download at. */
async function hrefFor(
  endpoint: string,
  filterParams?: Record<string, string | undefined>,
): Promise<string> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(ExportButton, { endpoint, filterParams }))
  })
  const anchor = container.querySelector('a')
  if (!anchor) throw new Error('the button rendered no anchor')
  return anchor.getAttribute('href') ?? ''
}

describe('ExportButton — one well-formed query', () => {
  it('appends the filters to a bare path with a single `?`', async () => {
    expect(await hrefFor('/api/orders/export', { status: 'open' })).toBe(
      '/api/orders/export?status=open',
    )
  })

  it('uses `&` when the endpoint already carries a query string', async () => {
    // The malformed shape was `/api/orders/export?format=csv?status=open`.
    const href = await hrefFor('/api/orders/export?format=csv', { status: 'open' })
    expect(href).toBe('/api/orders/export?format=csv&status=open')
    expect(href.match(/\?/g), 'exactly one query separator').toHaveLength(1)
    // …and the existing parameter still parses as the caller wrote it.
    expect(new URL(href, 'http://localhost').searchParams.get('format')).toBe('csv')
    expect(new URL(href, 'http://localhost').searchParams.get('status')).toBe('open')
  })

  it('leaves the endpoint alone when no filter value is set', async () => {
    expect(await hrefFor('/api/orders/export', { status: undefined })).toBe('/api/orders/export')
    expect(await hrefFor('/api/orders/export?format=csv', {})).toBe('/api/orders/export?format=csv')
  })
})
