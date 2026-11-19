import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { type ComponentType, createElement, type ReactNode } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import ts from 'typescript'
import { expect, it } from 'vitest'

import { ListRouteNav } from '@molecule/app-routing-react-router'

import { addPackages, createAppProject } from '../scaffold.js'

it('generates an inventory filter recipe that links server-provided categories to their results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'list-filter-recipe-'))
  try {
    await createAppProject(root, 'inventory', 'react')
    await addPackages(root, ['@molecule/app-routing-react-router'])
    const app = await readFile(join(root, 'src/App.tsx'), 'utf8')
    const example = app.match(/```tsx\n([\s\S]*?)```/)?.[1]
    expect(example).toBeTypeOf('string')
    const source = example!
      .split('\n')
      .map((line) => line.replace(/^\s*\* ?/, ''))
      .join('\n')
    const file = join(import.meta.dirname, 'inventory-filter-recipe.tsx')
    const options: ts.CompilerOptions = {
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      jsx: ts.JsxEmit.ReactJSX,
      types: [],
    }
    const host = ts.createCompilerHost(options)
    const getSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (path, version, onError, fresh) =>
      path === file
        ? ts.createSourceFile(path, source, version, true)
        : getSourceFile(path, version, onError, fresh)
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host))
    expect(
      diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    ).toEqual([])

    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { ...options, module: ts.ModuleKind.CommonJS },
    })
    const exports: {
      InventoryFilters?: ComponentType<{
        categories: string[]
        navigationLabel: string
        renderResults: (category: string | undefined, page: number) => ReactNode
      }>
    } = {}
    const imports = {
      'react/jsx-runtime': jsxRuntime,
      '@molecule/app-routing-react-router': { ListRouteNav },
    }
    new Function('require', 'exports', outputText)(
      (name: keyof typeof imports) => imports[name],
      exports,
    )
    expect(exports.InventoryFilters).toBeTypeOf('function')
    const render = (url: string): string =>
      renderToStaticMarkup(
        createElement(
          MemoryRouter,
          { initialEntries: [url] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/inventory/:category?',
              element: createElement(exports.InventoryFilters!, {
                categories: ['cold storage', 'hardware'],
                navigationLabel: 'Inventory categories',
                renderResults: (category, page) =>
                  createElement(
                    'p',
                    null,
                    category ? `No ${category} on page ${page}` : 'All stock',
                  ),
              }),
            }),
          ),
        ),
      )
    const unfiltered = render('/inventory?page=3')
    expect(unfiltered).toMatch(/<a[^>]+href="\/inventory\/cold%20storage"[^>]*>cold storage<\/a>/)
    expect(unfiltered).toContain('<p>All stock</p>')
    const filtered = render('/inventory/cold%20storage?page=2')
    expect(filtered).toMatch(/<a[^>]+aria-current="page"[^>]*>cold storage<\/a>/)
    expect(filtered).toContain('href="/inventory/hardware"')
    expect(filtered).toContain('<p>No cold storage on page 2</p>')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
