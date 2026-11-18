import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildCapabilityMap } from '../capability-map.js'
import { getRawRegistry } from '../registry.js'
import {
  addPackages,
  copyTemplateInstance,
  createApiProject,
  createAppProject,
  ensureAgentsMd,
  getTemplatesDir,
  readTemplateSetupSqlVersions,
} from '../scaffold.js'
import { DecisionGuide, MoleculeMetadata, RegistryEntry } from '../schema.js'

const registry = getRawRegistry()
const tagInput = '@molecule/app-tag-input-react'
const query = '@molecule/app-query-react'
const marker = '@molecule/capability-recipes:start'
let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'capability-recipes-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  await rm(`${root}-external`, { recursive: true, force: true })
})

/** A local, non-flagship app with source bytes that a refresh must preserve. */
async function app(packages: string[], workspace = ''): Promise<string> {
  const dir = join(root, workspace)
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ dependencies: Object.fromEntries(packages.map((name) => [name, '1.0.0'])) }),
  )
  await writeFile(join(dir, 'src/App.tsx'), 'export const App = () => <main>Inbox</main>\n')
  await writeFile(join(dir, 'src/config.ts'), 'export const authConfig = {}\n')
  return dir
}

describe('declared recipes beside editable app source', () => {
  it.each([
    {
      pkg: '@molecule/api-resource-follow',
      snippets: [
        "import { follow, unfollow, isFollowing, getFollowedIds } from '@molecule/api-resource-follow'",
        'follows(followerId, targetType, targetId)',
      ],
    },
    {
      pkg: '@molecule/api-slug',
      snippets: [
        "import { uniqueSlugInTable } from '@molecule/api-slug'",
        'uniqueSlugInTable(table, column, title, { excludeId, fallback })',
        'uniqueSlug(title, isTaken, options)',
      ],
    },
    {
      pkg: '@molecule/api-resource-comment',
      snippets: [
        "import { createNumberedComment, getCommentsByResource, getCommentByNumber, deleteComment } from '@molecule/api-resource-comment'",
        'createNumberedComment(resourceType, resourceId, userId, { body })',
        'getCommentsByResource(resourceType, resourceId, { limit, offset })',
        'getCommentByNumber(number)',
        'deleteComment(comment.id, userId)',
        'comments and comment_numbers',
      ],
    },
  ])('puts $pkg calls in the API scaffold router and capability map', async ({ pkg, snippets }) => {
    await createApiProject(root, 'catalog-api')
    await addPackages(root, [pkg])
    const path = join(root, 'src/App/router.ts')
    const router = await readFile(path, 'utf8')

    await ensureAgentsMd(root)

    const guided = await readFile(path, 'utf8')
    const map = await readFile(join(root, 'AGENTS.md'), 'utf8')
    for (const source of [guided, map])
      for (const snippet of snippets) expect(source).toContain(snippet)
    expect(guided.endsWith(router)).toBe(true)
  })

  it('shows the follow recipe in a copied video-streaming flagship with its existing follows table', async () => {
    const template = join(getTemplatesDir(), 'apps', 'video-streaming')
    const project = join(root, 'video-streaming')
    await copyTemplateInstance(
      template,
      project,
      'video-streaming',
      await readTemplateSetupSqlVersions(template),
    )

    const source = await readFile(join(project, 'api/src/App/router.ts'), 'utf8')
    expect(source).toContain(
      "import { follow, unfollow, isFollowing, getFollowedIds } from '@molecule/api-resource-follow'",
    )
    expect(source).toContain('follows(followerId, targetType, targetId)')
    expect(source).toContain("import { uniqueSlugInTable } from '@molecule/api-slug'")
    expect(
      await readFile(join(project, 'api/migrations/0010_video_streaming_tables.sql'), 'utf8'),
    ).toContain('CREATE TABLE public.follows')
  })

  it('puts shared comment calls beside the copied Note Taking router and keeps its storage', async () => {
    const template = join(getTemplatesDir(), 'apps', 'note-taking')
    const project = join(root, 'note-taking')
    await copyTemplateInstance(
      template,
      project,
      'note-taking',
      await readTemplateSetupSqlVersions(template),
    )

    const router = await readFile(join(project, 'api/src/App/router.ts'), 'utf8')
    expect(router).toContain('getCommentByNumber(number)')
    expect(router).toContain('router.use(templateHandlers)')
    const migration = 'api/migrations/0010_note_taking_tables.sql'
    expect(await readFile(join(project, migration), 'utf8')).toContain(
      await readFile(join(template, migration), 'utf8'),
    )
    expect(await readFile(join(project, 'api/__setup__/comment_numbers.sql'), 'utf8')).toContain(
      'CREATE TABLE IF NOT EXISTS "comment_numbers"',
    )
  })

  it('leaves custom storage and its API router unchanged without a declared resource', async () => {
    await createApiProject(root, 'internal-api')
    const path = join(root, 'src/App/router.ts')
    const store = `\nexport function recordShipment(id: string) {\n  return query('INSERT INTO shipment_events (id) VALUES ($1)', [id])\n}\n`
    const router = `import { query } from '@molecule/api-database'\n${await readFile(path, 'utf8')}${store}`
    await writeFile(path, router)

    await ensureAgentsMd(root)

    expect(await readFile(path, 'utf8')).toBe(router)
  })

  it('delivers the shared tag and query paths in the real React scaffold', async () => {
    await createAppProject(root, 'support-inbox', 'react')
    await addPackages(root, [tagInput, query, '@molecule/app-state', '@molecule/app-react'])
    const before = await readFile(join(root, 'src/App.tsx'), 'utf8')
    await ensureAgentsMd(root)
    const source = await readFile(join(root, 'src/App.tsx'), 'utf8')
    // These were installed features with no decision map entry or in-file recipe.
    expect(source).toContain('import { TagInput }')
    expect(source).toContain('<TagInput value={tags} onChange={setTags} />')
    expect(source).toContain('useTagInput({ value: tags, onChange: setTags })')
    expect(source).toContain('useQuery({ key: [http.baseURL, path, viewer, params]')
    expect(source).toContain('enabled.update((current) => !current)')
    expect(source).toContain('commit receives the DESIRED state')
    expect(source.endsWith(before)).toBe(true)
    const agents = await readFile(join(root, 'AGENTS.md'), 'utf8')
    expect(agents).toContain(`### Tag Input React — \`${tagInput}\``)
    expect(agents).toContain(`### Query Cache React — \`${query}\``)
  })

  it('puts request shaping beside authConfig, independently of response mapping', async () => {
    await createAppProject(root, 'member-directory', 'react')
    await addPackages(root, ['@molecule/app-auth', '@molecule/app-react'])
    await ensureAgentsMd(root)
    const config = await readFile(join(root, 'src/config.ts'), 'utf8')
    expect(config).toContain(
      'mapRequestBody: (payload: Record<string, unknown>) => ({ account: payload })',
    )
    expect(config).toContain('profileRequestBody: (payload: unknown) => ({ account: payload })')
    expect(config).toContain('Flat login/register bodies need no mapper')
    expect(config).toContain('mapAuthResponse only reads the answer')
    expect(config.indexOf('mapRequestBody')).toBeLessThan(config.indexOf('export const authConfig'))
  })

  it('compiles the auth body recipes in the scaffold uncontextualized config object', () => {
    const guide = registry.packages['@molecule/app-auth']!.decisionGuide!.configuration.join('\n')
    const request = /mapRequestBody: \([^)]*\) => \(\{ account: payload \}\)/.exec(guide)?.[0]
    const profile = /profileRequestBody: \([^)]*\) => \(\{ account: payload \}\)/.exec(guide)?.[0]
    expect(request).toBeDefined()
    expect(profile).toBeDefined()
    const source = `import { createJWTAuthClient } from '@molecule/app-auth'
const authConfig = { ${request}, ${profile} }
createJWTAuthClient(authConfig)
`
    const file = join(import.meta.dirname, '__auth-body-recipes__.ts')
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    }
    const host = ts.createCompilerHost(options)
    const getSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (path, languageVersion, onError, fresh) =>
      path === file
        ? ts.createSourceFile(path, source, languageVersion, true)
        : getSourceFile(path, languageVersion, onError, fresh)
    const errors = ts
      .getPreEmitDiagnostics(ts.createProgram([file], options, host))
      .filter((diagnostic) => diagnostic.file?.fileName === file)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    expect(errors).toEqual([])
  })

  it('keeps one recipe prefix after a copied template receives its auth guidance and refreshes', async () => {
    const template = join(root, 'templates/apps/support-inbox')
    const project = join(root, 'project')
    await mkdir(join(template, 'app/src'), { recursive: true })
    await writeFile(join(template, 'package.json'), JSON.stringify({ workspaces: ['app'] }))
    await writeFile(
      join(template, 'app/package.json'),
      JSON.stringify({
        dependencies: { '@molecule/app-auth': '3.3.1', '@molecule/app-react': '3.4.3' },
      }),
    )
    await writeFile(join(template, 'app/src/config.ts'), 'export const authConfig = {}\n')
    await copyTemplateInstance(template, project, 'support-inbox', {})
    await ensureAgentsMd(project)
    const path = join(project, 'app/src/config.ts')
    const config = await readFile(path, 'utf8')
    expect(config.split(marker)).toHaveLength(2)
    expect(config.startsWith(`/* ${marker}`)).toBe(true)
    await ensureAgentsMd(project)
    expect(await readFile(path, 'utf8')).toBe(config)
  })

  it('refreshes recipes when packages change without replacing source or a user AGENTS.md', async () => {
    const dir = await app([query])
    const code = await readFile(join(dir, 'src/App.tsx'), 'utf8')
    await writeFile(join(root, 'AGENTS.md'), '# My conventions\n')
    await ensureAgentsMd(root)
    const first = await readFile(join(dir, 'src/App.tsx'), 'utf8')
    expect(first).toContain(query)
    expect(first).not.toContain(tagInput)
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { [tagInput]: '1.0.0' } }),
    )
    await ensureAgentsMd(root)
    const updated = await readFile(join(dir, 'src/App.tsx'), 'utf8')
    expect(updated).toContain(tagInput)
    expect(updated).not.toContain(query)
    expect(updated.endsWith(code)).toBe(true)
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe('# My conventions\n')
    await ensureAgentsMd(root)
    expect(await readFile(join(dir, 'src/App.tsx'), 'utf8')).toBe(updated)
  })

  it('removes only its own generated prefix when the last relevant package is removed', async () => {
    const dir = await app([tagInput])
    const code = await readFile(join(dir, 'src/App.tsx'), 'utf8')
    await ensureAgentsMd(root)
    expect(await readFile(join(dir, 'src/App.tsx'), 'utf8')).toContain(marker)
    await writeFile(join(dir, 'package.json'), '{}')
    await ensureAgentsMd(root)
    expect(await readFile(join(dir, 'src/App.tsx'), 'utf8')).toBe(code)
  })

  it('keeps app declarations out of an API workspace and preserves a source shebang', async () => {
    const dir = await app([tagInput], 'app')
    const api = await app([], 'api')
    const apiSource = await readFile(join(api, 'src/App.tsx'), 'utf8')
    const code = '#!/usr/bin/env node\nexport const App = () => <main>Inbox</main>\n'
    await writeFile(join(dir, 'src/App.tsx'), code)
    await ensureAgentsMd(root)
    const source = await readFile(join(dir, 'src/App.tsx'), 'utf8')
    expect(source.startsWith('#!/usr/bin/env node\n/*')).toBe(true)
    expect(source).toContain(tagInput)
    expect(source.endsWith(code.split('\n').slice(1).join('\n'))).toBe(true)
    expect(await readFile(join(api, 'src/App.tsx'), 'utf8')).toBe(apiSource)
  })

  it('leaves a local-only app and a feature without source recipes unchanged', async () => {
    const dir = await app(['@molecule/app-settings-panel-react'])
    const before = await readFile(join(dir, 'src/App.tsx'), 'utf8')
    await ensureAgentsMd(root)
    expect(await readFile(join(dir, 'src/App.tsx'), 'utf8')).toBe(before)
    expect(buildCapabilityMap(registry, ['@molecule/app-settings-panel-react'])).toEqual([])
  })

  it('accepts one-shot declarations without consuming them before AGENTS.md is rendered', async () => {
    const dir = await app([])
    function* declared(): Generator<string> {
      yield tagInput
    }
    await ensureAgentsMd(root, declared())
    expect(await readFile(join(dir, 'src/App.tsx'), 'utf8')).toContain(tagInput)
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toContain(tagInput)
  })

  it('refuses to stamp a source symlink outside the app without changing its target', async () => {
    const dir = await app([tagInput])
    const outside = `${root}-external`
    await mkdir(outside)
    const target = join(outside, 'Shared.tsx')
    const code = 'export const Shared = () => <main>Other project</main>\n'
    await writeFile(target, code)
    await rm(join(dir, 'src/App.tsx'))
    await symlink(target, join(dir, 'src/App.tsx'))
    const refusal = await ensureAgentsMd(root).catch((error: unknown) => error)
    expect(refusal).toMatchObject({ message: expect.stringContaining('outside the project') })
    expect(await readFile(target, 'utf8')).toBe(code)
  })

  it('retains recipe targets through both metadata parsers and rejects source-path escapes', () => {
    const guide = { sourceFiles: ['src/App.tsx'], configuration: ['Use the declared hook.'] }
    const entry = registry.packages[tagInput]!
    expect(DecisionGuide.parse(guide).sourceFiles).toEqual(['src/App.tsx'])
    expect(
      RegistryEntry.parse({ ...entry, decisionGuide: guide }).decisionGuide?.sourceFiles,
    ).toEqual(guide.sourceFiles)
    expect(
      MoleculeMetadata.parse({ ...entry, decisionGuide: guide }).decisionGuide?.sourceFiles,
    ).toEqual(guide.sourceFiles)
    for (const source of [
      '../outside.ts',
      '/outside.ts',
      'src/../outside.ts',
      'src/App.vue',
      'src/+routes/layout.ts',
      'src/routes/++layout.ts',
      'src/routes/+../layout.ts',
    ]) {
      expect(DecisionGuide.safeParse({ ...guide, sourceFiles: [source] }).success).toBe(false)
    }
  })

  // Swapping one provider for another must not lose the guide a model reads: SvelteKit's
  // routing binding named no source file while its four siblings did, so a SvelteKit app was
  // the one app whose list-route recipe never reached its source (2026-11-14).
  it('lands every provider guide in a source file when a sibling provider does', () => {
    const byCore = new Map<string, string[]>()
    for (const [name, entry] of Object.entries(registry.packages))
      if (entry.implements && entry.decisionGuide)
        byCore.set(entry.implements, [...(byCore.get(entry.implements) ?? []), name])
    const homeless: string[] = []
    for (const [core, providers] of byCore) {
      const landed = providers.filter((name) => registry.packages[name].decisionGuide?.sourceFiles)
      if (landed.length === 0) continue
      for (const name of providers)
        if (!landed.includes(name)) homeless.push(`${name} (siblings of ${core}: ${landed[0]})`)
    }
    expect(homeless).toEqual([])
  })

  it("accepts a SvelteKit route module, whose name keeps the framework's `+` prefix", () => {
    const sourceFiles = ['src/routes/+layout.ts', 'src/routes/settings/+page.ts']
    const guide = { sourceFiles, configuration: ['Use the declared hook.'] }
    expect(DecisionGuide.parse(guide).sourceFiles).toEqual(sourceFiles)
  })
})
