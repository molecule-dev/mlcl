// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { type ComponentType, createElement } from 'react'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import {
  createQueryResource,
  QueryContent,
  type ResourceHttp,
  useQuery,
} from '@molecule/app-query-react'
import { provider as tanstack } from '@molecule/app-query-tanstack'
import { useOptimisticValue } from '@molecule/app-react'

const source = readFileSync(
  join(import.meta.dirname, '../../../templates/recipes/react/ResourceControls.tsx.tpl'),
  'utf8',
)
const exports: Record<string, ComponentType<Record<string, unknown>>> = {}
new Function(
  'require',
  'exports',
  'React',
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText,
)(
  (name: string) => {
    if (name === '@molecule/app-query-react') return { QueryContent }
    if (name === '@molecule/app-react') return { useOptimisticValue }
    if (name === 'react') return react
    throw new Error(`Unexpected recipe import: ${name}`)
  },
  exports,
  { createElement },
)
// The recipe imports React's real hooks, not an imitation controller.
import * as react from 'react'
const { ResourceToggle, ResourceCreateForm } = exports
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
interface Task {
  id: string
  title: string
  done: boolean
}
afterEach(cleanup)

it('the complete composition compiles against the installed public contracts', () => {
  const file = join(import.meta.dirname, '__resource-controls__.tsx')
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
  const read = host.getSourceFile.bind(host)
  host.getSourceFile = (name, version, onError, fresh) =>
    name === file
      ? ts.createSourceFile(file, source, version, true, ts.ScriptKind.TSX)
      : read(name, version, onError, fresh)
  expect(
    ts
      .getPreEmitDiagnostics(ts.createProgram([file], options, host))
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
  ).toEqual([])
})

describe.each([
  ['memory', memory],
  ['tanstack', tanstack],
] as const)('%s resource compositions', (_name, provider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(provider)
  })

  it('exposes no toggle before its record loads and queues an inverse click through refresh', async () => {
    const initial = deferred<{ data: Task }>(),
      refresh = deferred<{ data: Task[] }>()
    let rows: Task[] = [],
      posts = 0,
      deletes = 0
    const record: Task = { id: 't1', title: 'Inspect boiler', done: false }
    const http = {
      get: (path: string) => (path === '/tasks' ? refresh.promise : initial.promise),
      post: async () => {
        posts++
        return { data: { ...record, done: true } }
      },
      delete: async () => {
        deletes++
        return { data: { ...record, done: false } }
      },
    } as ResourceHttp
    const resource = createQueryResource<Task>({ name: 'tasks', path: '/tasks', http: () => http })
    const options = resource.list('operator')
    getQueryClient().set(options.key, rows)
    function Page(): react.ReactNode {
      const query = useQuery(resource.detail('operator', 't1'))
      return createElement(ResourceToggle, {
        query,
        identity: (task: Task) => task.id,
        value: (task: Task) => task.done,
        commit: async (task: Task, desired: boolean) =>
          (await resource.toggle('operator', task.id, 'done', desired)).done,
        onError: (error: unknown) => {
          throw error
        },
        children: (control: {
          value: boolean
          update: (fn: (value: boolean) => boolean) => void
        }) =>
          createElement(
            'button',
            { onClick: () => control.update((value) => !value) },
            control.value ? 'Reopen' : 'Complete',
          ),
      })
    }
    const view = render(createElement(Page))
    expect(view.queryByRole('button')).toBeNull()
    await act(async () => initial.resolve({ data: record }))
    fireEvent.click(view.getByText('Complete'))
    await waitFor(() => expect(posts).toBe(1))
    fireEvent.click(view.getByText('Reopen'))
    expect((view.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
    await act(async () => {
      rows = [{ ...record, done: true }]
      refresh.resolve({ data: rows })
    })
    await waitFor(() => expect(deletes).toBe(1))
    expect(view.getByText('Complete')).toBeTruthy()
  })

  it('keeps a create form natively disabled while a refreshed row is visible, then accepts the next draft', async () => {
    let rows: Task[] = [],
      reads = 0,
      posts = 0
    const delayed = deferred<{ data: Task[] }>()
    const http = {
      get: async () => {
        reads++
        return reads === 3 ? delayed.promise : { data: [...rows] }
      },
      post: async (_path: string, body: unknown) => {
        posts++
        const row = { id: String(posts), done: false, ...(body as { title: string }) }
        rows = [...rows, row]
        return { data: row }
      },
    } as ResourceHttp
    const resource = createQueryResource<Task, { title: string }>({
      name: 'tasks',
      path: '/tasks',
      http: () => http,
    })
    function Page(): react.ReactNode {
      const query = useQuery(resource.list('operator'))
      return createElement(
        'section',
        null,
        createElement(ResourceCreateForm, {
          create: async (input: { title: string }) => {
            await resource.create('operator', input)
            await resource.refresh('operator')
          },
          readInput: (data: FormData) => ({ title: String(data.get('title')) }),
          error: (error: unknown) => createElement('p', { role: 'alert' }, String(error)),
          children: [
            createElement('input', { key: 'draft', name: 'title', 'aria-label': 'Task' }),
            createElement('button', { key: 'submit', type: 'submit' }, 'Add task'),
          ],
        }),
        createElement(QueryContent<Task[]>, {
          query,
          children: (items) =>
            createElement(
              'ul',
              null,
              items.map((row) => createElement('li', { key: row.id }, row.title)),
            ),
        }),
      )
    }
    const view = render(createElement(Page))
    await waitFor(() => expect(reads).toBe(1))
    fireEvent.change(view.getByLabelText('Task'), { target: { value: 'One' } })
    fireEvent.click(view.getByText('Add task'))
    await view.findByText('One')
    expect((view.container.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
    expect(view.getByText('Add task').matches(':disabled')).toBe(true)
    ;(view.getByText('Add task') as HTMLButtonElement).click()
    expect(posts).toBe(1)
    await act(async () => delayed.resolve({ data: [...rows] }))
    await waitFor(() =>
      expect((view.container.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.change(view.getByLabelText('Task'), { target: { value: 'Two' } })
    fireEvent.click(view.getByText('Add task'))
    await view.findByText('Two')
    expect(posts).toBe(2)
    expect(view.getAllByRole('listitem')).toHaveLength(2)
  })

  it('retains a failed draft and renders the failure instead of showing an invented row', async () => {
    const pending = deferred<unknown>()
    const view = render(
      createElement(ResourceCreateForm, {
        create: () => pending.promise,
        readInput: (data: FormData) => ({ title: data.get('title') }),
        error: (error: unknown) => createElement('p', { role: 'alert' }, String(error)),
        children: [
          createElement('input', { key: 'draft', name: 'title', defaultValue: 'Keep this' }),
          createElement('button', { key: 'submit', type: 'submit' }, 'Save'),
        ],
      }),
    )
    fireEvent.click(view.getByText('Save'))
    await act(async () => pending.reject(new Error('Offline')))
    expect(view.getByRole('alert').textContent).toContain('Offline')
    expect((view.container.querySelector('input') as HTMLInputElement).value).toBe('Keep this')
    expect((view.container.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(false)
  })
})
