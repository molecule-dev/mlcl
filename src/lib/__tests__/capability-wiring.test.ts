import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { readProjectCapabilityMap, renderCapabilityMap } from '../capability-map.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { getRawRegistry, loadRegistry } from '../registry.js'
import { copyTemplateInstance, ensureAgentsMd, readTemplateSetupSqlVersions } from '../scaffold.js'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'capability-wiring-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function app(source?: string): Promise<void> {
  await mkdir(join(root, 'src', 'bonds'), { recursive: true })
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@molecule/app-auth': '3.0.2',
        '@molecule/app-http': '1.5.1',
        '@molecule/app-bonds-default-react': '3.0.0',
        '@molecule/app-react': '3.0.2',
      },
    }),
  )
  if (source) await writeFile(join(root, 'src', 'bonds', 'session.ts'), source)
}

async function httpMap(): Promise<string> {
  const entries = await readProjectCapabilityMap(root)
  return renderCapabilityMap(entries.filter((entry) => entry.name === '@molecule/app-http'))
}

describe('capability map describes actual bond wiring', () => {
  it('points a fresh copied template at the composed HTTP provider', async () => {
    const template = join(import.meta.dirname, '../../../templates/apps/kanban-board')
    await copyTemplateInstance(
      template,
      root,
      'task-board',
      await readTemplateSetupSqlVersions(template),
    )
    await ensureAgentsMd(root)
    const agents = await readFile(join(root, 'AGENTS.md'), 'utf8')
    const http = agents.split('### HTTP Client')[1]
    expect(http).toContain('Wired bond: `app/src/bonds/auth-default.ts`')
    expect(http).not.toContain('http-default.ts')
    for (const match of agents.matchAll(/Wired bond: `([^`]+)`/g)) {
      await expect(access(join(root, match[1]!))).resolves.toBeUndefined()
    }
  })

  it('keeps directly generated HTTP wiring discoverable', async () => {
    await app()
    for (const file of synthesizeAppProjectFiles(
      [],
      ['@molecule/app-auth', '@molecule/app-http'],
      root,
      loadRegistry(),
    )) {
      if (!file.content || !file.targetPath.includes('/bonds/')) continue
      await writeFile(file.targetPath, file.content)
    }
    expect(await httpMap()).toContain('Wired bond: `src/bonds/http-default.ts`')
  })

  it('resolves a framework shared-code directory without inventing a default path', async () => {
    await mkdir(join(root, 'src/lib/bonds'), { recursive: true })
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@molecule/app-http': '1.5.1',
          '@molecule/app-svelte': '3.0.2',
        },
      }),
    )
    await writeFile(join(root, 'src/lib/config.ts'), 'export const API_BASE_URL = "/api"')
    await writeFile(
      join(root, 'src/lib/bonds/transport.ts'),
      "import * as http from '@molecule/app-http'\nhttp.setClient({})",
    )
    const map = await httpMap()
    expect(map).toContain('Wired bond: `src/lib/bonds/transport.ts`')
    expect(map).toContain('Configure in `src/lib/config.ts`')
    expect(map).not.toContain('`src/config.ts`')
  })

  it.each([false, true])(
    'describes only exported project configuration, including an optional export (%s)',
    async (present) => {
      await app()
      await writeFile(
        join(root, 'src/config.ts'),
        `export const API_BASE_URL = '/api'; export const authConfig = {}; ${present ? 'export const httpConfig = {}' : ''}`,
      )
      const registry = structuredClone(getRawRegistry())
      registry.packages['@molecule/app-http']!.defaultBondSetup!.configImport = 'httpConfig'
      const entry = (await readProjectCapabilityMap(root, registry)).find(
        (entry) => entry.name === '@molecule/app-http',
      )!
      expect(entry.configNames.includes('httpConfig')).toBe(present)
      expect(entry.configNames).toContain('API_BASE_URL')
      const map = renderCapabilityMap([entry])
      const configuration = map.split('\n').find((line) => line.startsWith('- Configure in'))!
      expect(configuration.includes('`httpConfig`')).toBe(present)
    },
  )

  it.each([
    "import { createDefaultAuthClientWithFetchClient as compose } from '@molecule/app-bonds-default-react'\nconst { setupAuthDefault } = compose({}); setupAuthDefault()",
    "import * as defaults from '@molecule/app-bonds-default-react'\nconst session = defaults.createDefaultAuthClientWithFetchClient({}); session.setupAuthDefault()",
  ])('resolves called composition factories with named or namespace imports', async (source) => {
    await app(source)
    expect(await httpMap()).toContain('Wired bond: `src/bonds/session.ts`')
    expect(await httpMap()).not.toContain('http-default.ts')
  })

  it.each([
    undefined,
    "import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'\n// createDefaultAuthClientWithFetchClient({})\nconst recipe = 'createDefaultAuthClientWithFetchClient({})'",
    "import { createDefaultAuthClientWithHttpSync } from '@molecule/app-bonds-default-react'\nconst { setupAuthDefault } = createDefaultAuthClientWithHttpSync({}); setupAuthDefault()",
    "import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'\ncreateDefaultAuthClientWithFetchClient({})",
    "import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'\nexport const unused = createDefaultAuthClientWithFetchClient({})",
    "import { createDefaultAuthClientWithFetchClient as compose } from '@molecule/app-bonds-default-react'\nfunction local(compose: () => { setupAuthDefault(): void }) { const result = compose(); result.setupAuthDefault() }; local(() => ({ setupAuthDefault() {} }))",
    "import { setClient } from '@molecule/app-http'\nfunction setup() { const setClient = () => {}; setClient() }; setup()",
    "import { createDefaultAuthClientWithFetchClient as compose } from '@molecule/app-bonds-default-react'\nconst { setupAuthDefault } = compose({}); function unused() { setupAuthDefault() }",
    "import * as defaults from '@molecule/app-bonds-default-react'\nfunction local(defaults: { createDefaultAuthClientWithFetchClient(): { setupAuthDefault(): void } }) { defaults.createDefaultAuthClientWithFetchClient().setupAuthDefault() }; local({ createDefaultAuthClientWithFetchClient: () => ({ setupAuthDefault() {} }) })",
  ])('does not label missing or unprovided HTTP wiring as wired', async (source) => {
    await app(source)
    expect(await httpMap()).not.toContain('Wired bond:')
  })
})
