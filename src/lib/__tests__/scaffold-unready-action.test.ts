import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { ESLint, type Linter } from 'eslint'
import ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const root = await mkdtemp(join(tmpdir(), 'unready-record-action-'))
await writeFile(
  join(root, 'package.json'),
  JSON.stringify({
    dependencies: { '@molecule/app-react': '1.0.0', '@molecule/app-query-react': '1.0.0' },
  }),
)
await mkdir(join(root, 'eslint-rules'))
for (const file of [
  'prefer-declared-clients.mjs',
  'no-empty-interactive-target.mjs',
  'no-dropped-action.mjs',
  'no-class-code.mjs',
])
  await copyFile(
    file === 'prefer-declared-clients.mjs' && process.env.DECLARED_CLIENT_RULE
      ? process.env.DECLARED_CLIENT_RULE
      : new URL(`../../../templates/shared/${file}`, import.meta.url),
    join(root, 'eslint-rules', file),
  )
await copyFile(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
  join(root, 'eslint.config.mjs'),
)
await symlink(dirname(dirname(require.resolve('eslint/package.json'))), join(root, 'node_modules'))
afterAll(() => rm(root, { recursive: true, force: true }))
const config = (await import(pathToFileURL(join(root, 'eslint.config.mjs')).href)).default
const engine = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })

async function findings(source: string): Promise<Linter.LintMessage[]> {
  const reports = await engine.lintText(source, { filePath: 'src/Bookmark.tsx' })
  expect(reports.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return reports.flatMap((file) =>
    file.messages.filter(
      (row) =>
        row.ruleId === 'molecule-local/no-dropped-action' && row.messageId === 'droppedAction',
    ),
  )
}
const custom = (
  control: string,
  extra = '',
  handler = 'if (!record) return; await save(record.id)',
): string => `
import { useEffect, useState } from 'react'
import { loadRecord, save } from './bookmarks.js'
export function Bookmark() {
  const [record, setRecord] = useState(null)
  useEffect(() => { loadRecord().then(setRecord) }, [])
  const change = async () => { ${handler} }
  ${extra}
  return ${control}
}`

describe('scaffold ESLint rejects enabled unloaded-record actions', () => {
  it.each(['positive', 'early-return'])(
    'rejects a query-mirrored record action reconstructed with the %s guard spelling',
    async (spelling) => {
      const fixture = await readFile(
        new URL('./fixtures/record-action-query-mirror.tsx.txt', import.meta.url),
        'utf8',
      )
      const source =
        spelling === 'positive'
          ? fixture
          : fixture.replace('if (profile) try {', 'if (!profile) return; try {')
      const rows = await findings(source)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ severity: 2, line: 34 })
      expect(rows[0].message).toContain('disabled={!profile}')
      expect(
        await findings(source.replace('type="button"', 'type="button" disabled={!profile}')),
      ).toEqual([])
      expect(
        await findings(
          source.replace('  return (', '  if (!profile) return <p>Loading</p>\n  return ('),
        ),
      ).toEqual([])
    },
  )
  it.each([
    'if (record) await save(record.id)',
    'if (record) try { await save(record.id) } catch(error) { notify(error) }',
    'record && save(record.id)',
  ])('rejects a positive readiness guard which silently skips the action: %s', async (handler) => {
    expect(
      await findings(custom('<button onClick={change}>Bookmark</button>', '', handler)),
    ).toHaveLength(1)
  })
  it('accepts a permission check with feedback and a local switch', async () => {
    expect(
      await findings(
        custom(
          '<button onClick={change}>Bookmark</button>',
          '',
          'if (!allowed) { notify("Permission required"); return } await save("route-id")',
        ),
      ),
    ).toEqual([])
    expect(
      await findings(
        `import {useState} from 'react';export function Switch(){const [open,setOpen]=useState(false);return <button onClick={()=>setOpen(value=>!value)}>Details</button>}`,
      ),
    ).toEqual([])
  })
  it.each([
    '3d-model-viewer/app/src/pages/Annotations.tsx',
    'ai-study-buddy/app/src/pages/Quiz.tsx',
    'photo-editor/app/src/pages/Editor.tsx',
    'subscription-box/app/src/pages/Billing.tsx',
    'survey-feedback-tool/app/src/pages/Notifications.tsx',
  ])('preserves existing guarded flagship actions in %s', async (file) => {
    const source = await readFile(
      new URL(`../../../templates/apps/${file}`, import.meta.url),
      'utf8',
    )
    expect(await findings(source)).toEqual([])
  })
  it('catches a non-X1 bookmark action before a slow initial read can discard its click', async () => {
    const rows = await findings(custom('<button onClick={change}>Bookmark</button>'))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ severity: 2, line: 9 })
    expect(rows[0].message).toContain('disabled={!record}')
  })
  it('follows the local wrapper used by an action control', async () => {
    expect(
      await findings(custom('<button onClick={() => void change()}>Bookmark</button>')),
    ).toHaveLength(1)
  })
  it.each([
    "status === 'authenticated' ? change : undefined",
    "status !== 'authenticated' ? undefined : change",
    "status === 'authenticated' && change",
    "status !== 'authenticated' || change",
    "status === 'authenticated' ? change : () => signIn()",
  ])('checks the initial record behind a conditional handler: %s', async (handler) => {
    const control = `<button onClick={${handler}}>Bookmark</button>`
    const rows = await findings(custom(control))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ severity: 2, line: 9 })
    expect(rows[0].message).toContain('disabled={!record}')
    expect(
      await findings(custom(control.replace('<button ', '<button disabled={!record} '))),
    ).toEqual([])
    expect(await findings(custom(`record && ${control}`))).toEqual([])
  })
  it('checks an immutable alias of a conditionally selected handler', async () => {
    expect(
      await findings(
        custom(
          '<button onClick={click}>Bookmark</button>',
          "const selected = status === 'authenticated' ? change : undefined; const click = selected",
        ),
      ),
    ).toHaveLength(1)
  })
  it('catches a query data alias as well as effect-loaded state', async () => {
    expect(
      await findings(
        `import {useState} from 'react';import {useQuery} from '@molecule/app-query-react';export function Bookmark(){const {data:record}=useQuery({key:['bookmark'],queryFn:loadRecord});const change=()=>{if(!record)return;save(record.id)};return <button onClick={change}>Bookmark</button>}`,
      ),
    ).toHaveLength(1)
  })
  it('catches query.data and an explicit null guard', async () => {
    expect(
      await findings(
        `import React from 'react';import {useQuery} from '@molecule/app-query-react';export function Bookmark(){const query=useQuery({key:['bookmark'],queryFn:loadRecord});const change=()=>{if(query.data==null)return;save(query.data.id)};return <button onClick={change}>Bookmark</button>}`,
      ),
    ).toHaveLength(1)
  })
  it('follows nullable query projections without guessing imported adapters', async () => {
    const source = `import type {JSX} from 'react';import {useQuery} from '@molecule/app-query-react';export function Bookmark(){const query=useQuery({key:['bookmark'],queryFn:loadRecord});const record=query.data?.bookmark;const change=()=>{if(!record)return;save(record.id)};return <button onClick={()=>void change()}>Bookmark</button>}`
    expect(await findings(source)).toHaveLength(1)
    expect(
      await findings(source.replace('<button onClick', '<button disabled={!record} onClick')),
    ).toEqual([])
  })
  it.each([
    '<button disabled={!record} onClick={change}>Bookmark</button>',
    '<button disabled={record == null} onClick={change}>Bookmark</button>',
    '<button disabled={!record || saving} onClick={change}>Bookmark</button>',
    'record && <button onClick={change}>Bookmark</button>',
    'record ? <button onClick={change}>Bookmark</button> : <span>Loading</span>',
  ])(
    'accepts a control whose initial data is required by its rendered state: %s',
    async (control) => {
      expect(await findings(custom(control))).toEqual([])
    },
  )
  it('accepts a loaded-record component return guard', async () => {
    expect(
      await findings(
        custom(
          '<button onClick={change}>Bookmark</button>',
          'if (!record) return <span>Loading</span>',
        ),
      ),
    ).toEqual([])
  })
  it('accepts an immutable readiness alias', async () => {
    expect(
      await findings(
        custom(
          '<button disabled={!ready} onClick={change}>Bookmark</button>',
          'const ready = Boolean(record)',
        ),
      ),
    ).toEqual([])
  })
  it('leaves an action which works without a loaded record alone', async () => {
    expect(
      await findings(
        custom('<button onClick={change}>Bookmark</button>', '', 'await save("id-from-route")'),
      ),
    ).toEqual([])
  })
  it('requires the same availability gate for a local optional selection', async () => {
    expect(
      await findings(
        "import {useState} from 'react';export function Selection(){const [record,setRecord]=useState(null);const click=()=>{if(!record)return;show(record)};return <button onClick={click}>Inspect selection</button>}",
      ),
    ).toHaveLength(1)
  })
  it('preserves an authentication branch that provides navigation feedback', async () => {
    expect(
      await findings(
        custom(
          '<button onClick={change}>Bookmark</button>',
          '',
          'if (!record) { navigate("/login"); return } await save(record.id)',
        ),
      ),
    ).toEqual([])
  })
  it('does not accept an unrelated busy flag or aria-disabled as initial-data protection', async () => {
    expect(
      await findings(
        custom(
          '<button disabled={saving} aria-disabled={!record} onClick={change}>Bookmark</button>',
        ),
      ),
    ).toHaveLength(1)
  })
  it('checks each control even when a sibling correctly disables itself', async () => {
    expect(
      await findings(
        custom(
          '<><button disabled={!record} onClick={change}>Safe</button><button onClick={change}>Unsafe</button></>',
        ),
      ),
    ).toHaveLength(1)
  })
  it('accepts Book Tracker shelf controls and rejects exposing them before their book loads', async () => {
    const source = await readFile(
      new URL('../../../templates/apps/book-tracker/app/src/pages/BookDetail.tsx', import.meta.url),
      'utf8',
    )
    expect(await findings(source)).toEqual([])
    const tree = ts.createSourceFile(
      'BookDetail.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    let guard: ts.IfStatement | undefined
    const find = (node: ts.Node): void => {
      if (
        ts.isIfStatement(node) &&
        node.expression.getText(tree) === '!book' &&
        ts.isReturnStatement(node.thenStatement)
      )
        guard = node
      ts.forEachChild(node, find)
    }
    find(tree)
    expect(guard).toBeDefined()
    const exposed = source.slice(0, guard!.getStart(tree)) + source.slice(guard!.end)
    expect((await findings(exposed)).length).toBeGreaterThan(0)
  })
  it('rejects exposing a positive-guarded Book Tracker edit action before its book loads', async () => {
    const source = await readFile(
      new URL('../../../templates/apps/book-tracker/app/src/pages/BookDetail.tsx', import.meta.url),
      'utf8',
    )
    const positive = source.replace(
      /const startEdit = \(\) => \{\s*if \(!book\) return([\s\S]*?)\n {2}\}/,
      'const startEdit = () => { if (book) {$1\n  }}',
    )
    expect(positive).not.toBe(source)
    const tree = ts.createSourceFile(
      'BookDetail.tsx',
      positive,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    let guard: ts.IfStatement | undefined
    const find = (node: ts.Node): void => {
      if (
        ts.isIfStatement(node) &&
        node.expression.getText(tree) === '!book' &&
        ts.isReturnStatement(node.thenStatement)
      )
        guard = node
      ts.forEachChild(node, find)
    }
    find(tree)
    expect(guard).toBeDefined()
    const exposed = positive.slice(0, guard!.getStart(tree)) + positive.slice(guard!.end)
    const line = exposed.slice(0, exposed.indexOf('onClick={startEdit}')).split('\n').length
    expect((await findings(exposed)).some((row) => row.line <= line && row.endLine! >= line)).toBe(
      true,
    )
  })
})

// Retains the P414 shape: the form is mounted for a signed-in viewer, while only
// an unrelated delete button waits for the record. preventDefault is not an action.
it('reports a signed-in form that silently drops submit before its record loads', async () => {
  const source = `import {useState} from 'react'
  export function Discussion({user}) {
    const [record, setRecord] = useState(null)
    const [body, setBody] = useState('')
    function submit(event) { event.preventDefault(); if (!record || !user || !body.trim()) return; save(record.id, body) }
    return <>{user ? <form onSubmit={submit}><textarea value={body} onChange={e=>setBody(e.target.value)}/><button type="submit">Send</button></form> : null}<button disabled={!record} onClick={()=>remove(record.id)}>Delete</button></>
  }`
  const bad = await findings(source)
  expect(
    bad.some(
      (row) => row.message.includes('each submit button') && row.message.includes('!record'),
    ),
  ).toBe(true)
  expect(
    await findings(
      source.replace(
        '<button type="submit">',
        '<button disabled={!record || !body.trim()} type="submit">',
      ),
    ),
  ).toEqual([])
})
