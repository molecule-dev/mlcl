// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import ts from 'typescript'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'
import * as query from '@molecule/app-query-react'
import { useOptimisticValue } from '@molecule/app-react'

interface RecordValue {
  id: string
  enabled: boolean
  count: number
}
interface Props {
  record: RecordValue
  save: (id: string, enabled: boolean) => Promise<RecordValue>
  labels: { active: string; inactive: string }
  onError: (error: unknown) => void
}
const labels = { active: 'Undo', inactive: 'Done' }
const initial: RecordValue = { id: 'habit-a', enabled: false, count: 0 }

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

// Execute the shipped recipe with the real shared hook and query bond. Only the
// visual Button wrapper is replaced; it preserves native events and attributes.
function example(): Record<string, react.ComponentType<Props>> {
  const text = readFileSync(
    join(import.meta.dirname, '../../../templates/.agents/skills/patterns/card-actions.md'),
    'utf8',
  )
  const source = [...text.matchAll(/```tsx\n([\s\S]*?)```/g)].find((match) =>
    match[1]?.includes('export function RecordToggle'),
  )?.[1]
  if (!source) throw Error('Missing executable server toggle recipe')
  const output = ts.transpileModule(source, {
    fileName: 'card-actions.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports: Record<string, react.ComponentType<Props>> = {}
  const imports: Record<string, unknown> = {
    react,
    'react/jsx-runtime': jsx,
    '@molecule/app-react': { useOptimisticValue },
    '@molecule/app-query-react': query,
    '@molecule/app-ui-react': {
      Button: (props: react.ButtonHTMLAttributes<HTMLButtonElement>) =>
        react.createElement('button', props),
    },
  }
  new Function('require', 'exports', output)((id: string) => {
    if (!(id in imports)) throw Error('Unexpected import ' + id)
    return imports[id]
  }, exports)
  return exports
}

beforeEach(() => {
  setProvider(provider)
  resetQueryClient()
})
afterEach(() => {
  cleanup()
  resetQueryClient()
})

it('the executable recipe compiles against the installed shared contracts', () => {
  const file = join(import.meta.dirname, '__server-toggle-consumer__.tsx')
  const text = readFileSync(
    join(import.meta.dirname, '../../../templates/.agents/skills/patterns/card-actions.md'),
    'utf8',
  )
  const source = [...text.matchAll(/```tsx\n([\s\S]*?)```/g)].find((match) =>
    match[1]?.includes('export function RecordToggle'),
  )![1]!
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
    path === file
      ? ts.createSourceFile(path, source, languageVersion, true, ts.ScriptKind.TSX)
      : getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile)
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host))
  expect(
    diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
  ).toEqual([])
})

it('keeps the inverse click while its first save is pending and saves both in order', async () => {
  const View = example().RecordToggle!
  const first = deferred<RecordValue>(),
    second = deferred<RecordValue>()
  const save = vi
    .fn<Props['save']>()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const view = render(
    react.createElement(View, { record: initial, save, labels, onError: vi.fn() }),
  )
  const button = view.getByRole('button')
  fireEvent.click(button)
  expect(button.textContent).toBe('Undo 1')
  fireEvent.click(button)
  expect(button.textContent).toBe('Done 0')
  expect(save.mock.calls).toEqual([['habit-a', true]])
  await act(async () => first.resolve({ ...initial, enabled: true, count: 1 }))
  expect(save.mock.calls).toEqual([
    ['habit-a', true],
    ['habit-a', false],
  ])
  expect(button.textContent).toBe('Done 0')
  await act(async () => second.resolve(initial))
  expect(button.getAttribute('aria-busy')).toBe('false')
})

it('a changed parent count cannot overwrite an optimistic inverse while its save is pending', async () => {
  const View = example().RecordToggle!
  const response = deferred<RecordValue>()
  const props = { save: vi.fn(() => response.promise), labels, onError: vi.fn() }
  const view = render(
    react.createElement(View, { ...props, record: { ...initial, enabled: true, count: 1 } }),
  )
  const button = view.getByRole('button')
  fireEvent.click(button)
  view.rerender(
    react.createElement(View, { ...props, record: { ...initial, enabled: true, count: 2 } }),
  )
  expect(button.textContent).toBe('Done 0')
  await act(async () => response.resolve(initial))
  expect(button.textContent).toBe('Done 0')
})

it('a pre-mutation read arriving after the save cannot overwrite the saved query response', async () => {
  const View = example().CachedRecordToggle as unknown as react.ComponentType<
    Record<string, unknown>
  >
  const client = getQueryClient()
  const key = ['habits', 'viewer-a', initial.id]
  client.set(key, initial)
  const stale = deferred<RecordValue>()
  const props = {
    queryKey: key,
    load: () => stale.promise,
    labels,
    onError: vi.fn(),
    save: vi.fn(async () => ({ ...initial, enabled: true, count: 1 })),
  }
  const view = render(react.createElement(View, props))
  const button = view.getByRole('button')
  let pending!: Promise<RecordValue>
  act(() => {
    pending = client.fetch({ key, staleMs: 0, fetch: () => stale.promise })
  })
  await act(async () => fireEvent.click(button))
  expect(button.textContent).toBe('Undo 1')
  await act(async () => {
    stale.resolve(initial)
    await pending
  })
  expect(client.get(key)).toEqual({ ...initial, enabled: true, count: 1 })
  expect(button.textContent).toBe('Undo 1')
  // A genuinely newer server write still reaches the already mounted control.
  act(() => client.set(key, { ...initial, count: 4 }))
  expect(button.textContent).toBe('Done 4')
})

it('counterexample: an idle control accepts a genuinely changed external flag and count', () => {
  const View = example().RecordToggle!
  const props = { save: vi.fn(), labels, onError: vi.fn() }
  const view = render(react.createElement(View, { ...props, record: initial }))
  view.rerender(
    react.createElement(View, { ...props, record: { ...initial, enabled: true, count: 7 } }),
  )
  expect(view.getByRole('button').textContent).toBe('Undo 7')
  expect(props.save).not.toHaveBeenCalled()
})

it('keeps the action label and count on the saved state without a parent refresh', async () => {
  const View = example().RecordToggle!
  const save = vi.fn(async (id: string, enabled: boolean) => ({
    id,
    enabled,
    count: enabled ? 1 : 0,
  }))
  const view = render(
    react.createElement(View, { record: initial, save, labels, onError: vi.fn() }),
  )
  const button = view.getByRole('button')
  await act(async () => fireEvent.click(button))
  expect(button.getAttribute('aria-pressed')).toBe('true')
  expect(button.textContent).toBe('Undo 1')
  await act(async () => fireEvent.click(button))
  expect(button.getAttribute('aria-pressed')).toBe('false')
  expect(button.textContent).toBe('Done 0')
  expect(save.mock.calls).toEqual([
    ['habit-a', true],
    ['habit-a', false],
  ])
})

it('reports a rejected save and restores the last server-confirmed flag and count', async () => {
  const View = example().RecordToggle!
  const response = deferred<RecordValue>()
  const onError = vi.fn(),
    error = new Error('save rejected')
  const view = render(
    react.createElement(View, { record: initial, labels, onError, save: () => response.promise }),
  )
  fireEvent.click(view.getByRole('button'))
  await act(async () => response.reject(error))
  expect(view.getByRole('button').textContent).toBe('Done 0')
  expect(onError).toHaveBeenCalledExactlyOnceWith(error)
})

it('a record key change cannot inherit the preceding record pending value', async () => {
  const View = example().RecordToggle!
  const response = deferred<RecordValue>()
  const props = { labels, onError: vi.fn(), save: () => response.promise }
  const view = render(react.createElement(View, { ...props, key: 'a', record: initial }))
  fireEvent.click(view.getByRole('button'))
  view.rerender(
    react.createElement(View, { ...props, key: 'b', record: { ...initial, id: 'habit-b' } }),
  )
  await act(async () => response.resolve({ ...initial, enabled: true, count: 1 }))
  expect(view.getByRole('button').textContent).toBe('Done 0')
})
