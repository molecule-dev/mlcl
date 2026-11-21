import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  createRequestHandler,
  type MoleculeRequest,
  type MoleculeResponse,
  type RequestHandlerOptions,
} from '@molecule/api-resource'

import * as ai from '../ai.js'
import { buildCapabilityMap } from '../capability-map.js'
import type { InjectionPlan } from '../injector.js'
import { synthesizeProjectFiles, writeSynthesizedFiles } from '../injector.js'
import { getRawRegistry, loadRegistry } from '../registry.js'
import { MoleculeMetadata, RegistryEntry } from '../schema.js'

let directory: string
beforeAll(() => ai.disableAI())
afterEach(async () => {
  vi.restoreAllMocks()
  if (directory) await rm(directory, { recursive: true, force: true })
})

function plan(name: string, factory?: string): InjectionPlan {
  return {
    molecule: name,
    moleculePackage: {
      name,
      version: '1.0.0',
      dependencies: {},
      peerDependencies: {},
      type: 'resource',
      path: '/fixture',
      routes: [{ method: 'post', path: '/entries', handler: 'create', middlewares: [] }],
      tables: [],
      exports: ['requestHandlerMap', 'authorization', 'helper', ...(factory ? [factory] : [])],
      molecule: {
        type: 'resource',
        requestHandlerMapFactory: factory,
        reExports: ['helper'],
      },
    },
    files: [],
    dependencies: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }
}

async function synthesize(resource: InjectionPlan): ReturnType<typeof synthesizeProjectFiles> {
  directory = await mkdtemp(join(tmpdir(), 'mlcl-configurable-resource-'))
  return synthesizeProjectFiles([resource], [resource.molecule], directory, undefined, 'express')
}

function execute(source: string, exports: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'exports', js)(() => exports, result)
  return result
}

// Configure the actual generated call's object, as an app does. The old static
// re-export has no call to configure, so it keeps its flat-body response and the
// same HTTP assertion fails. No missing export/import is the regression oracle.
function configure(source: string, factory: string): string {
  const replacement = ts.createSourceFile(
    'options.ts',
    `const options = {
      mapRequest: (req) => ({ body: req.body.record }),
      mapResponse: (result) => ({ ...result, body: { record: result.body } }),
    }`,
    ts.ScriptTarget.Latest,
    true,
  )
  const declaration = replacement.statements[0] as ts.VariableStatement
  const options = declaration.declarationList.declarations[0].initializer!
  const file = ts.createSourceFile('wrapper.ts', source, ts.ScriptTarget.Latest, true)
  const transform = ts.transform(file, [
    (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isCallExpression(node) && node.expression.getText(file) === factory)
          return context.factory.updateCallExpression(node, node.expression, node.typeArguments, [
            options,
          ])
        return ts.visitEachChild(node, visit, context)
      }
      return (node) => ts.visitNode(node, visit) as ts.SourceFile
    },
  ])
  try {
    return ts.createPrinter().printFile(transform.transformed[0])
  } finally {
    transform.dispose()
  }
}

function fixtureMap(options: RequestHandlerOptions = {}): {
  create: ReturnType<typeof createRequestHandler>
} {
  return {
    create: createRequestHandler(
      (req) =>
        req.body?.title
          ? { statusCode: 201, body: { title: req.body.title } }
          : { statusCode: 400, body: { error: 'title is required' } },
      options,
    ),
  }
}

async function call(
  map: ReturnType<typeof fixtureMap>,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  let status = 0
  let payload: unknown
  const res = {
    status: (value: number) => {
      status = value
    },
    send: (value: unknown) => {
      payload = value
    },
  }
  const next = vi.fn()
  await map.create({ body } as MoleculeRequest, res as unknown as MoleculeResponse, next)
  expect(next).not.toHaveBeenCalled()
  return { status, body: payload }
}

describe('resource routes in generated composition roots', () => {
  it('mounts a complete service router and keeps app edits on reinjection', async () => {
    const factory = 'createAnnouncementHandlers'
    const resource = plan('@molecule/api-resource-announcement', factory)
    resource.moleculePackage!.molecule!.category = 'announcements'
    resource.moleculePackage!.molecule!.expressRouter = `import { Router } from 'express'

import { publish } from '@molecule/api-resource-announcement'

const router = Router()
router.post('/entries', async (req, res): Promise<void> => {
  const entry = await publish(req.body)
  res.status(201).json(entry)
})

export default router
`
    const files = await synthesize(resource)
    const wrapper = join(directory, 'src/App/Resource/Announcement/index.ts')
    const handler = join(directory, 'src/handlers/announcements.ts')
    const router = join(directory, 'src/App/router.ts')
    expect(files.some((file) => file.targetPath === wrapper)).toBe(false)
    const written = await writeSynthesizedFiles(
      files.filter((file) => [handler, router].includes(file.targetPath)),
    )
    expect(written.error).toBeNull()
    expect(await readFile(router, 'utf8')).toContain('router.use(resourceAnnouncementRouter)')
    expect(written.written).toContain(handler)

    const source = await readFile(handler, 'utf8')
    const edited = source.replace('json(entry)', 'json({ entry })')
    expect(edited).not.toBe(source)
    await writeFile(handler, edited)

    const reinjected = await synthesizeProjectFiles(
      [resource],
      [resource.molecule],
      directory,
      undefined,
      'express',
    )
    expect(reinjected.some((file) => [handler, wrapper].includes(file.targetPath))).toBe(false)
    expect(await readFile(handler, 'utf8')).toBe(edited)
    expect(reinjected.some((file) => file.targetPath === router)).toBe(false)
  })

  it('keeps existing feature handlers and their legacy inline resource configuration', async () => {
    const factory = 'createAnnouncementHandlers'
    const resource = plan('@molecule/api-resource-announcement', factory)
    directory = await mkdtemp(join(tmpdir(), 'mlcl-configurable-resource-'))
    resource.moleculePackage!.molecule!.category = 'announcements'
    const handler = join(directory, 'src/handlers/announcements.ts')
    const wrapper = join(directory, 'src/App/Resource/Announcement/index.ts')
    const localHandler = 'export const custom = true\n'
    await mkdir(dirname(handler), { recursive: true })
    await writeFile(handler, localHandler)

    const generate = (): ReturnType<typeof synthesizeProjectFiles> =>
      synthesizeProjectFiles([resource], [resource.molecule], directory, undefined, 'express')
    const files = await generate()
    expect(files.some((file) => file.targetPath === handler)).toBe(false)
    const wrapperSource = files.find((file) => file.targetPath === wrapper)!.content!
    const configured = configure(wrapperSource, factory)
    await mkdir(dirname(wrapper), { recursive: true })
    await writeFile(wrapper, configured)

    expect((await generate()).some((file) => file.targetPath === wrapper)).toBe(false)
    expect(await readFile(handler, 'utf8')).toBe(localHandler)
    expect(await readFile(wrapper, 'utf8')).toBe(configured)
  })

  it('does not replace a custom handler created after the scaffold planned its files', async () => {
    const resource = plan('@molecule/api-resource-announcement', 'createAnnouncementHandlers')
    resource.moleculePackage!.molecule!.category = 'announcements'
    resource.moleculePackage!.molecule!.expressRouter = `import { Router } from 'express'
export default Router()
`
    const files = await synthesize(resource)
    const handler = join(directory, 'src/handlers/announcements.ts')
    const wrapper = join(directory, 'src/App/Resource/Announcement/index.ts')
    const localHandler = 'export const custom = true\n'
    await mkdir(dirname(handler), { recursive: true })
    await writeFile(handler, localHandler)

    const result = await writeSynthesizedFiles(
      files.filter((file) => file.targetPath === wrapper || file.targetPath === handler),
    )
    expect(result).toMatchObject({ error: expect.stringContaining('EEXIST'), written: [] })
    expect(await readFile(handler, 'utf8')).toBe(localHandler)
    await expect(readFile(wrapper, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each(['createAnnouncementHandlers', 'buildArchiveEndpoints'])(
    'configures %s without rewriting a handler or depending on an article name',
    async (factory) => {
      const files = await synthesize(plan('@molecule/api-resource-announcement', factory))
      const wrapper = String(
        files.find((f) => f.targetPath.endsWith('/Resource/Announcement/index.ts'))!.content,
      )
      const exports = {
        [factory]: fixtureMap,
        requestHandlerMap: fixtureMap(),
        authorization: {},
        helper: 'helper-value',
      }
      const configured = execute(configure(wrapper, factory), exports)
      expect(
        await call(configured.requestHandlerMap as ReturnType<typeof fixtureMap>, {
          record: { title: 'Quarterly update' },
        }),
      ).toEqual({ status: 201, body: { record: { title: 'Quarterly update' } } })
      expect(configured.authorization).toBe(exports.authorization)
      expect(configured.helper).toBe('helper-value')
      const native = execute(wrapper, exports)
      expect(
        await call(native.requestHandlerMap as ReturnType<typeof fixtureMap>, {
          title: 'Flat contract',
        }),
      ).toEqual({ status: 201, body: { title: 'Flat contract' } })
    },
  )

  it('scaffolds article HTTP code that calls the published services', async () => {
    const pkg = loadRegistry().find((entry) => entry.name === '@molecule/api-resource-article')!
    const resource = { ...plan(pkg.name), moleculePackage: pkg }
    const files = await synthesize(resource)
    const handler = files.find((file) =>
      file.targetPath.endsWith('/handlers/articles.ts'),
    )!.content!
    expect(handler).toContain("router.post('/articles', async")
    expect(handler).toContain('await createArticle(')
    expect(handler).toContain('await listArticles(')
    expect(handler).toContain('await getFeed(')
    expect(handler).not.toContain('createArticleHandlers')
    expect(files.some((file) => file.targetPath.endsWith('/Resource/Article/index.ts'))).toBe(false)
    expect(files.find((file) => file.targetPath.endsWith('/App/router.ts'))?.content).toContain(
      'edit api/src/handlers/articles.ts',
    )
    expect(
      files.find((file) => file.targetPath.endsWith('/__tests__/routes.test.ts'))?.content,
    ).toContain("import('../handlers/articles.js')")
  })

  it('points the declared capability map at the editable article routes', () => {
    const pkg = loadRegistry().find((entry) => entry.name === '@molecule/api-resource-article')!
    const entry = buildCapabilityMap(getRawRegistry(), [{ name: pkg.name, workspace: 'api' }])[0]
    expect(entry?.sourceFiles).toContain('src/handlers/articles.ts')
    expect(entry?.configuration.some((line) => line.includes('listArticles'))).toBe(true)
  })

  it('keeps a resource without options metadata on its existing static map', async () => {
    const files = await synthesize(plan('@molecule/api-resource-announcement'))
    const wrapper = String(
      files.find((f) => f.targetPath.endsWith('/Resource/Announcement/index.ts'))!.content,
    )
    const map = fixtureMap()
    const result = execute(wrapper, { requestHandlerMap: map, authorization: {} })
    expect(result.requestHandlerMap).toBe(map)
    expect(await call(map, { title: 'Existing contract' })).toEqual({
      status: 201,
      body: { title: 'Existing contract' },
    })
  })

  it('generates callable smoke-test mocks for the same configured factory', async () => {
    const factory = 'createAnnouncementHandlers'
    const files = await synthesize(plan('@molecule/api-resource-announcement', factory))
    const test = String(
      files.find((f) => f.targetPath.endsWith('/__tests__/server.test.ts'))!.content,
    )
    const mock = test.match(
      /vi\.mock\('@molecule\/api-resource-announcement', \(\) => \(\{[\s\S]*?\}\)\)/,
    )![0]
    const mocked: Record<string, unknown> = {}
    const js = ts.transpileModule(mock, {}).outputText
    new Function('vi', js)({
      fn: vi.fn,
      mock: (_name: string, make: () => object) => Object.assign(mocked, make()),
    })
    expect(mocked[factory]).toBeTypeOf('function')
    const map = (mocked[factory] as () => Record<string, unknown>)()
    expect(map.create).toBeTypeOf('function')
    expect(mocked.authorization).toBeDefined()
    expect(mocked.helper).toBeTypeOf('function')
  })

  it('keeps the declared factory and its mocks consistent when AI generation is available', async () => {
    vi.spyOn(ai, 'isAIAvailable').mockReturnValue(true)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const generate = vi
      .spyOn(ai, 'generateCode')
      .mockImplementation(async (_prompt, _context, task) => {
        // This is a valid answer to the old mock prompt, which only teaches the
        // legacy wrapper factory/static map. Unrelated generators fall back.
        if (task.startsWith('Generate vi.mock()'))
          return "vi.mock('@molecule/api-resource-announcement', () => ({ requestHandlerMap: { create: vi.fn() } }))"
        throw new Error('fixture uses the normal heuristic fallback')
      })
    const factory = 'createAnnouncementHandlers'
    const files = await synthesize(plan('@molecule/api-resource-announcement', factory))
    const wrapper = String(
      files.find((f) => f.targetPath.endsWith('/Resource/Announcement/index.ts'))!.content,
    )
    const make = vi.fn(fixtureMap)
    execute(wrapper, { [factory]: make, authorization: {}, helper: {} })
    expect(make).toHaveBeenCalledExactlyOnceWith({})
    const test = String(
      files.find((f) => f.targetPath.endsWith('/__tests__/server.test.ts'))!.content,
    )
    const mocked: Record<string, unknown> = {}
    const mock = test.match(
      /vi\.mock\('@molecule\/api-resource-announcement', \(\) => \(\{[\s\S]*?\}\)\)/,
    )![0]
    const js = ts.transpileModule(mock, {}).outputText
    new Function('vi', js)({
      fn: vi.fn,
      mock: (_name: string, make: () => object) => Object.assign(mocked, make()),
    })
    expect(mocked[factory]).toBeTypeOf('function')
    expect(generate.mock.calls.some(([, , task]) => task.startsWith('Generate vi.mock()'))).toBe(
      false,
    )
  })

  it.each(['notExported', 'factory(); process.exit(1)'])(
    'refuses invalid factory metadata (%s) before emitting a broken wrapper',
    async (factory) => {
      const resource = plan('@molecule/api-resource-announcement', 'createAnnouncementHandlers')
      resource.moleculePackage!.molecule!.requestHandlerMapFactory = factory
      await expect(synthesize(resource)).rejects.toThrow(
        'requestHandlerMapFactory must name an exported function',
      )
    },
  )

  it('preserves the options factory in both public metadata schemas', () => {
    const entry = getRawRegistry().packages['@molecule/api-resource-article']
    const value = { ...entry, requestHandlerMapFactory: 'createArticleHandlers' }
    for (const schema of [RegistryEntry, MoleculeMetadata]) {
      expect(schema.parse(value).requestHandlerMapFactory).toBe('createArticleHandlers')
      expect(schema.safeParse({ ...value, requestHandlerMapFactory: 'factory()' }).success).toBe(
        false,
      )
    }
  })
})
