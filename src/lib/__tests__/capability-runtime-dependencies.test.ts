import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const packageRoot = join(import.meta.dirname, '../../..')
let root: string
beforeEach(async () => {
  // Inside the package, so the module resolves its dependencies as the package does:
  // from its own node_modules or a workspace's hoisted ones.
  await mkdir(join(packageRoot, '.tmp'), { recursive: true })
  root = await mkdtemp(join(packageRoot, '.tmp', 'capability-runtime-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function guardedImport(source: string): Promise<ReturnType<typeof spawnSync>> {
  const modulePath = join(root, 'capability-map.mjs')
  const guard = join(root, 'guard.mjs')
  await writeFile(modulePath, source)
  const runtimeDirectory = pathToFileURL(join(packageRoot, 'dist/lib')).href + '/'
  await writeFile(
    guard,
    `import { registerHooks } from 'node:module'
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'typescript') throw new Error('PRODUCTION_DEPENDENCY_GUARD')
  if (specifier.startsWith('./') && context.parentURL === ${JSON.stringify(pathToFileURL(modulePath).href)}) {
    return nextResolve(new URL(specifier, ${JSON.stringify(runtimeDirectory)}).href, context)
  }
  return nextResolve(specifier, context)
} })`,
  )
  return spawnSync(process.execPath, ['--import', guard, modulePath], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  })
}

describe('capability guidance uses published runtime dependencies', () => {
  it('rejects a development-only TypeScript import under the production guard', async () => {
    const result = await guardedImport("await import('typescript')")
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('PRODUCTION_DEPENDENCY_GUARD')
  })

  it('loads the actual capability module without development-only TypeScript', async () => {
    const source = await readFile(join(packageRoot, 'src/lib/capability-map.ts'), 'utf8')
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
    const result = await guardedImport(
      compiled +
        '\nawait (await import("node:fs/promises")).writeFile(' +
        JSON.stringify(join(root, 'receipt.json')) +
        ', JSON.stringify(buildCapabilityMap({packages:{}}, [])))',
    )
    expect(result.status, String(result.stderr)).toBe(0)
    expect(await readFile(join(root, 'receipt.json'), 'utf8')).toBe('[]')
  })
  it('loads documentation command discovery without development-only TypeScript', async () => {
    const source = await readFile(join(packageRoot, 'src/lib/docs-sync.ts'), 'utf8')
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
    const result = await guardedImport(
      compiled +
        '\nawait (await import("node:fs/promises")).writeFile(' +
        JSON.stringify(join(root, 'receipt.json')) +
        ', typeof generateDocs)',
    )
    expect(result.status, String(result.stderr)).toBe(0)
    expect(await readFile(join(root, 'receipt.json'), 'utf8')).toBe('function')
  })
})
