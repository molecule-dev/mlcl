/**
 * A molecule name is DATA, and the injector uses it verbatim as a path segment
 * (`src/App/Resource/<name>/index.ts`), as a generated identifier, and as the
 * dependency key it writes back into the manifest. It reaches the injector from
 * the target manifest's `@molecule/*` dependency keys (`mlcl inject` reads its
 * pending molecules from there), and the resolver honors a `file:` value
 * pointing anywhere — so a cloned/hostile project can hand the injector a name
 * carrying `../`, and `join()` walks the generated wrapper out of the project.
 * The package's OWN declared name (`scanPackage` reads it from its package.json)
 * is the same data by another door.
 *
 * Driven through the real `planInjection` → `synthesizeProjectFiles` →
 * `writeSynthesizedFiles` against a project on disk; nothing is mocked.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type InjectionPlan,
  planInjection,
  synthesizeProjectFiles,
  writeSynthesizedFiles,
} from '../injector.js'

/** `api-/../../../../../evil` — five `..` segments, which reach above the project. */
const EVIL_NAME = '@molecule/api-/../../../../../evil'

/** The resource metadata a payload package declares for itself. */
const RESOURCE_MOLECULE = {
  type: 'resource',
  category: 'test',
  label: 'Evil',
  routes: [{ method: 'get', path: '/evil', handler: 'listEvil', middlewares: [] }],
  tables: [],
}

let root: string
let project: string

/**
 * A project manifest whose `@molecule/*` keys are the molecule names under
 * test, plus the `file:payload` package those keys resolve to — which declares
 * `declaredName` as ITS OWN name.
 */
function makeProject(dependencies: Record<string, string>, declaredName: string): void {
  root = mkdtempSync(join(tmpdir(), 'mlcl-name-containment-'))
  project = join(root, 'app')
  mkdirSync(project, { recursive: true })
  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify({ name: 'app', version: '0.0.1', dependencies }, null, 2),
  )
  mkdirSync(join(project, 'payload'), { recursive: true })
  writeFileSync(
    join(project, 'payload', 'package.json'),
    JSON.stringify({ name: declaredName, version: '1.0.0', molecule: RESOURCE_MOLECULE }),
  )
}

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('the injector refuses a name that is not a package name', () => {
  beforeEach(() => {
    // The crafted key IS the molecule name `mlcl inject` will plan; its `file:`
    // value points the resolver at a package inside the repo, so resolution
    // succeeds and the name is the only thing left before the filesystem.
    makeProject({ [EVIL_NAME]: 'file:payload' }, EVIL_NAME)
  })

  it('refuses an escaping manifest key before any path is derived from it', async () => {
    const plan = await planInjection(EVIL_NAME, project)

    // The refusal is visible rather than a silent no-op: the plan carries no
    // package, which is the resolution-failure channel the inject command
    // reports and exits non-zero on — and with no package there is no resource to
    // synthesize from, so no path is ever derived from the name. (The assertions
    // that used to stand here — "no file landed outside the project", "nothing was
    // written above it" — could not fail for exactly that reason: they ran over a
    // file set with no name-derived path in it. What the SYNTHESIS does with a
    // name it is handed is what the forged-plan test below drives.)
    expect(plan.moleculePackage).toBeFalsy()
    expect(plan.conflicts.map((conflict) => conflict.path)).toContain(EVIL_NAME)
  })

  it('never writes a name-derived file outside the project, even for a plan the guard never saw', async () => {
    // `synthesizeProjectFiles` is exported and takes any plan, so it cannot rely
    // on `planInjection` having refused the name for it. Drive it with the plan
    // the guard exists to prevent: a resource package (so a wrapper IS
    // synthesized) whose molecule NAME escapes. Without the containment check in
    // the wrapper loop, `join(projectPath, 'src', 'App', 'Resource',
    // 'api-/../../../../../evil', 'index.ts')` resolves to `<root>/evil/index.ts`
    // — outside the project and outside everything the injector owns.
    const forged = {
      molecule: EVIL_NAME,
      moleculePackage: {
        name: '@molecule/api-probe',
        version: '0.0.0',
        type: 'resource',
        dependencies: {},
        peerDependencies: {},
        routes: [{ method: 'get', path: '/probe', handler: 'listProbe', middlewares: [] }],
        tables: [],
        exports: [],
        path: join(project, 'payload'),
      },
      files: [],
      dependencies: [],
      migrations: [],
      bondSetup: null,
      conflicts: [],
    } as unknown as InjectionPlan

    const files = await synthesizeProjectFiles([forged], [EVIL_NAME], project, undefined, 'express')
    const escaped = files
      .map((file) => file.targetPath)
      .filter((target) => !target.startsWith(`${project}/`))
    expect(escaped, 'no synthesized file may land outside the project').toEqual([])

    await writeSynthesizedFiles(files)
    expect(existsSync(join(root, 'evil')), 'nothing may be written above the project').toBe(false)

    // …and the check is narrow: the SAME plan under a legal name still gets its
    // wrapper (no over-tightening to "no wrappers at all").
    const legal = { ...forged, molecule: '@molecule/api-probe' } as unknown as InjectionPlan
    const legalFiles = await synthesizeProjectFiles(
      [legal],
      ['@molecule/api-probe'],
      project,
      undefined,
      'express',
    )
    expect(
      legalFiles.some(
        (file) => file.targetPath === join(project, 'src', 'App', 'Resource', 'Probe', 'index.ts'),
      ),
      'a legal name still synthesizes its wrapper',
    ).toBe(true)
  })

  it('refuses a package whose own manifest declares an escaping name', async () => {
    // The requested name is a legal one; the traversal is declared by the
    // payload package about ITSELF, and would otherwise become the dependency
    // key written back into the project manifest.
    makeProject({ '@molecule/api-payload': 'file:payload' }, EVIL_NAME)

    const plan = await planInjection('@molecule/api-payload', project)

    expect(plan.moleculePackage).toBeFalsy()
    expect(plan.dependencies).toEqual([])
    expect(plan.conflicts.map((conflict) => conflict.path)).toContain(join(project, 'payload'))
  })

  it('still plans an ordinary package name (no over-tightening)', async () => {
    makeProject({ '@molecule/api-payload': 'file:payload' }, '@molecule/api-payload')

    const plan = await planInjection('@molecule/api-payload', project)

    expect(plan.moleculePackage?.name).toBe('@molecule/api-payload')
    expect(plan.conflicts).toEqual([])
    expect(plan.dependencies.map((dependency) => dependency.name)).toContain(
      '@molecule/api-payload',
    )
  })
})
