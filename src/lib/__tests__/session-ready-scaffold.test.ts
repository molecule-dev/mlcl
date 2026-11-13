import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { copyTemplateFiles } from '../scaffold.js'

const root = join(import.meta.dirname, '../../..')

/** Read executable JSX attributes, excluding comments and explicit false values. */
function providersIn(source: string): { auth: boolean; awaitSession: boolean }[] {
  const file = ts.createSourceFile(
    'App.tsx',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  )
  const providers: { auth: boolean; awaitSession: boolean }[] = []
  function visit(node: ts.Node): void {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(file) === 'MoleculeProvider'
    ) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute)
      const hold = attrs.find((attr) => attr.name.getText(file) === 'awaitSession')
      providers.push({
        auth: attrs.some((attr) => attr.name.getText(file) === 'auth'),
        awaitSession:
          !!hold &&
          (!hold.initializer ||
            (ts.isJsxExpression(hold.initializer) &&
              hold.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword)),
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return providers
}

describe('session readiness in generated apps', () => {
  it.each(['react', 'react-native-web'])(
    'enables the hold in a generated %s app',
    async (framework) => {
      const target = await mkdtemp(join(tmpdir(), 'session-ready-scaffold-'))
      try {
        await copyTemplateFiles(target, framework, 'session-ready-app')
        const files = ['src/App.tsx', 'src/components/AuthGuard.tsx']
        const sources = await Promise.all(
          files
            .filter((file) => existsSync(join(target, file)))
            .map((file) => readFile(join(target, file), 'utf8')),
        )
        expect(sources.flatMap(providersIn)).toEqual([{ auth: true, awaitSession: true }])
      } finally {
        await rm(target, { recursive: true, force: true })
      }
    },
  )

  it('enables the hold in every auth-enabled flagship', () => {
    const fleet = join(root, 'templates/apps')
    let checked = 0
    for (const entry of readdirSync(fleet, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const app = join(fleet, entry.name, 'app/src/App.tsx')
      if (!existsSync(app)) continue
      for (const provider of providersIn(readFileSync(app, 'utf8'))) {
        if (!provider.auth) continue
        checked++
        expect(provider.awaitSession, entry.name).toBe(true)
      }
    }
    expect(checked).toBe(150)
  })

  it('keeps the auth-free prerendered static site outside the hold', () => {
    const app = readFileSync(join(root, 'templates/apps/static-site/app/src/App.tsx'), 'utf8')
    expect(providersIn(app)).toEqual([{ auth: false, awaitSession: false }])
  })

  it('rejects a missing or disabled hold even when a comment advertises it', () => {
    expect(
      providersIn('// awaitSession\n<MoleculeProvider auth={client} awaitSession={false} />'),
    ).toEqual([{ auth: true, awaitSession: false }])
    expect(providersIn('<MoleculeProvider auth={client} />')).toEqual([
      { auth: true, awaitSession: false },
    ])
  })
})
