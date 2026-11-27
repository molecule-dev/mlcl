import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache, getRegistryPath } from '../registry.js'
import { createShowcaseProject, showcaseBasePort, VISUAL_TEST_FRAMEWORKS } from '../visual-test.js'

let scratch: string
let registry: {
  toolchain: { shared: Record<string, string>; app: Record<string, string> }
  appFrameworks: Record<
    string,
    { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  >
  packages: Record<string, { buildTooling?: { devDependencies?: Record<string, string> } }>
}

beforeEach(async () => {
  registry = JSON.parse(await readFile(getRegistryPath(), 'utf8'))
  scratch = await mkdtemp(join(tmpdir(), 'showcase-manifest-'))
  const path = join(scratch, 'registry.json')
  await writeFile(path, JSON.stringify(registry))
  vi.stubEnv('MLCL_REGISTRY_PATH', path)
  clearRegistryCache()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  clearRegistryCache()
  await rm(scratch, { recursive: true, force: true })
})

describe('showcase install manifests', () => {
  it.each(VISUAL_TEST_FRAMEWORKS)('%s uses the current registry pins', async (framework) => {
    const directory = await createShowcaseProject(framework, scratch)
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).toEqual(registry.appFrameworks[framework].dependencies ?? {})
    expect(manifest.devDependencies).toEqual({
      vite: registry.toolchain.app.vite,
      typescript: registry.toolchain.shared.typescript,
      ...registry.packages['@molecule/app-styling-tailwind'].buildTooling?.devDependencies,
      ...registry.appFrameworks[framework].devDependencies,
    })
    expect(await readFile(join(directory, 'src/vite-env.d.ts'), 'utf8')).toContain('vite/client')
  })

  it('follows later toolchain and framework pin changes without a source table update', async () => {
    registry.toolchain.app.vite = '99.0.0'
    registry.toolchain.shared.typescript = '99.1.0'
    registry.appFrameworks.vue.devDependencies!['@vitejs/plugin-vue'] = '99.2.0'
    await writeFile(join(scratch, 'registry.json'), JSON.stringify(registry))
    clearRegistryCache()
    const directory = await createShowcaseProject('vue', scratch)
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    expect(manifest.devDependencies).toMatchObject({
      vite: '99.0.0',
      typescript: '99.1.0',
      '@vitejs/plugin-vue': '99.2.0',
    })
  })

  it('uses the scaffold’s React Native Web compatibility module and CSS imports', async () => {
    const directory = await createShowcaseProject('react-native-web', scratch)
    const config = await readFile(join(directory, 'vite.config.ts'), 'utf8')
    expect(config).toContain("'src/react-native-web.js'")
    const runtime = await readFile(join(directory, 'src', 'react-native-web.js'), 'utf8')
    const template = await readFile(
      new URL('../../../templates/app/react-native-web/react-native-web.js.tpl', import.meta.url),
      'utf8',
    )
    expect(runtime).toBe(template)

    const css = await readFile(join(directory, 'src', 'index.css'), 'utf8')
    expect(css).toMatch(/^@import 'tailwindcss\/utilities\.css';$/m)
    const react = await createShowcaseProject('react', scratch)
    expect(await readFile(join(react, 'src', 'index.css'), 'utf8')).toContain(
      "@import 'tailwindcss';",
    )
  })

  it('refuses missing framework metadata rather than inventing fallback versions', async () => {
    delete registry.appFrameworks.vue
    await writeFile(join(scratch, 'registry.json'), JSON.stringify(registry))
    clearRegistryCache()
    await expect(createShowcaseProject('vue', scratch)).rejects.toThrow(/framework.*vue/i)
  })
})

// Two parity runs on one machine (a coordinator and a fixer) need separate port ranges.
describe('showcase base port', () => {
  it('is 5200 unless MOLECULE_SHOWCASE_BASE_PORT moves it, and refuses a value that is not a port', () => {
    expect(showcaseBasePort(undefined)).toBe(5200)
    expect(showcaseBasePort('')).toBe(5200)
    expect(showcaseBasePort('5300')).toBe(5300)
    expect(() => showcaseBasePort('53oo')).toThrow(/MOLECULE_SHOWCASE_BASE_PORT/)
    expect(() => showcaseBasePort('80')).toThrow(/1024 to 65000/)
  })
})

// A showcase renders its kit, not markup written by hand.
//
// cross-framework.spec.ts compares each showcase section with React's. A section assembled by hand
// from the classes a component is made of (the Angular showcase did that for ten components until
// 2026-11-27, the Svelte showcase for all twenty) passes or fails on that markup, never on the
// kit, so a kit that differs from React stays unseen.

const SHOWCASE_TEMPLATES = fileURLToPath(new URL('../../../templates/showcase/', import.meta.url))

/**
 * A call to a class generator (`getSwitchClasses(`, `getTabsListClasses(`) or to the ClassMap's
 * accessor: a class list assembled by hand instead of a kit component.
 */
const CLASS_GENERATOR = /\bget[A-Z]\w*Class(es)?\(|getClassMap\(/g

/** What replaces a class list assembled by hand; ends each such problem. */
const BY_HAND =
  `: render the kit's component with the catalogue entry's props instead of writing its ` +
  'markup by hand'

/** A showcase's source file: TypeScript, JavaScript, Svelte or Vue. */
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|svelte|vue)$/

/** One source file of a framework's showcase. */
export interface ShowcaseSource {
  /** The file, relative to the package root. */
  path: string
  /** Its text. */
  source: string
}

/**
 * Reads every source file of a framework's showcase directory.
 *
 * @param templates - The showcase templates directory, the one with a folder per framework.
 * @param framework - The framework.
 * @returns The source files, sorted by path.
 */
export async function readShowcaseSources(
  templates: string,
  framework: string,
): Promise<ShowcaseSource[]> {
  const root = join(templates, framework)
  const sources: ShowcaseSource[] = []
  for (const file of (await readdir(root, { recursive: true })).sort()) {
    if (!SOURCE_FILE.test(file)) continue
    sources.push({
      path: `templates/showcase/${framework}/${file}`,
      source: await readFile(join(root, file), 'utf8'),
    })
  }
  return sources
}

/**
 * What keeps a framework's showcase from rendering its kit's components: a source file that calls
 * a class generator or the ClassMap (its markup is written by hand), or no source file that reads
 * the catalogue.
 *
 * @param framework - The framework.
 * @param sources - Its showcase's source files.
 * @returns The problems, each naming its file; none when the showcase renders its kit.
 */
export function showcaseSourceProblems(
  framework: string,
  sources: readonly ShowcaseSource[],
): string[] {
  const problems = sources.flatMap(({ path, source }) =>
    [...source.matchAll(CLASS_GENERATOR)].map(
      (call) => `${path} calls ${call[0].slice(0, -1)}${BY_HAND}`,
    ),
  )
  if (!sources.some(({ source }) => /\bshowcaseComponents\b/.test(source)))
    problems.push(
      `templates/showcase/${framework}/ has no source file that reads showcaseComponents: ` +
        'render one section per catalogue entry',
    )
  return problems
}

describe('showcase sources render the kit', () => {
  it.each(VISUAL_TEST_FRAMEWORKS)(
    '%s reads the catalogue and writes no markup by hand',
    async (framework) => {
      const sources = await readShowcaseSources(SHOWCASE_TEMPLATES, framework)
      expect(showcaseSourceProblems(framework, sources)).toEqual([])
    },
  )

  it.each([
    [
      'a class generator',
      'const classes = getSwitchClasses({ checked })',
      'calls getSwitchClasses',
    ],
    ['the ClassMap', 'const cm = getClassMap()', 'calls getClassMap'],
  ])('refuses a showcase that assembles its classes by hand with %s', (_, line, problem) => {
    const sources = [
      {
        path: 'templates/showcase/svelte/Showcase.svelte',
        source: `${line}\nconst specs = showcaseComponents\n`,
      },
    ]
    expect(showcaseSourceProblems('svelte', sources)).toEqual([
      `templates/showcase/svelte/Showcase.svelte ${problem}${BY_HAND}`,
    ])
  })

  it('refuses a showcase that does not read the catalogue', () => {
    const sources = [
      {
        path: 'templates/showcase/vue/Showcase.ts',
        source:
          "import { Button } from '@molecule/app-ui-vue'\nconst entries = [['Button', Button]]\n",
      },
    ]
    expect(showcaseSourceProblems('vue', sources)).toEqual([
      'templates/showcase/vue/ has no source file that reads showcaseComponents: render one section per catalogue entry',
    ])
  })
})
