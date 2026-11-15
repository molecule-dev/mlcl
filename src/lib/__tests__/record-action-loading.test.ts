// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import ts from 'typescript'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

const require = createRequire(import.meta.url)
const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const profileSource = await readFile(join(fixtures, 'record-action-query-mirror.tsx.txt'), 'utf8')
const querySource = await readFile(join(fixtures, 'record-action-http-query.tsx.txt'), 'utf8')

function evaluate(source: string, modules: Record<string, unknown>): Record<string, unknown> {
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const exports: Record<string, unknown> = {}
  new Function('require', 'exports', code)(
    (name: string) => modules[name] ?? require(name),
    exports,
  )
  return exports
}

function page(source: string): {
  client: { get: Mock; post: Mock; delete: Mock }
  load: () => Promise<void>
} {
  let resolve!: (response: unknown) => void
  const loaded = new Promise((res) => {
    resolve = res
  })
  const client = {
    get: vi.fn(() => loaded),
    post: vi.fn(async () => ({ data: { profile: { username: 'author', following: true } } })),
    delete: vi.fn(async () => ({ data: { profile: { username: 'author', following: false } } })),
  }
  const httpModule = { http: () => client, errorMessages: (error: unknown) => [String(error)] }
  const queryModule = evaluate(querySource, { './http.js': httpModule })
  const { Profile } = evaluate(source, {
    './http.js': httpModule,
    './useQuery.js': queryModule,
    '@molecule/app-react': { useAuth: () => ({ user: { username: 'reader' } }) },
  })
  render(createElement(Profile as ComponentType<{ username: string }>, { username: 'author' }))
  return {
    client,
    load: async () => {
      await act(async () =>
        resolve({ data: { profile: { username: 'author', following: false } } }),
      )
    },
  }
}

afterEach(cleanup)

describe('an action while its initial record is still loading', () => {
  it('reproduces the enabled click that sends no request and is never replayed', async () => {
    const { client, load } = page(profileSource)
    const button = screen.getByRole('button', { name: 'Follow author' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(client.post).not.toHaveBeenCalled()
    expect(client.delete).not.toHaveBeenCalled()
    await load()
    expect(client.post).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Follow author' })).toBe(button)
  })
  it('the diagnostic fix exposes a disabled control until loading settles, then follows and unfollows', async () => {
    const { client, load } = page(
      profileSource.replace('type="button"', 'type="button" disabled={!profile}'),
    )
    const button = screen.getByRole('button', { name: 'Follow author' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(client.post).not.toHaveBeenCalled()
    await load()
    expect(button.disabled).toBe(false)
    await act(async () => fireEvent.click(button))
    expect(client.post).toHaveBeenCalledExactlyOnceWith('/profiles/author/follow')
    expect(screen.getByRole('button', { name: 'Unfollow author' })).toBe(button)
    await act(async () => fireEvent.click(button))
    expect(client.delete).toHaveBeenCalledExactlyOnceWith('/profiles/author/follow')
    expect(screen.getByRole('button', { name: 'Follow author' })).toBe(button)
  })
})
